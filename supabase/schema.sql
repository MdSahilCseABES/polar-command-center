-- ============================================================
--  POLAR COMMAND CENTER — DATABASE SCHEMA
--  Integrated Polar Expedition Logistics & Asset Management System
--  National Polar Operations Platform · MoES / NCPOR
-- ============================================================
--
--  YOU DO NOT NEED THIS FILE TO RUN THE APP.
--  With no database set up, the console runs on built-in demo data and
--  everything works. This file is the optional upgrade that makes changes
--  survive a page refresh.
--
--  ---------------------------------------------------------------
--  HOW TO USE IT — six clicks, about two minutes
--  ---------------------------------------------------------------
--   1. Go to https://supabase.com and sign in to your project.
--      (No project yet? "New project", any name, any strong database
--       password, then wait ~2 minutes for it to finish setting up.)
--   2. In the left sidebar, click "SQL Editor".
--   3. Click "New query".
--   4. Copy EVERYTHING in this file and paste it into the box.
--   5. Click "Run" (or press Ctrl+Enter / Cmd+Enter).
--   6. You should see "Success. No rows returned". That is what success
--      looks like for a script that creates things.
--
--  Then put your two keys in a file called .env in the project root —
--  see .env.example for exactly where to find them — and restart the dev
--  server. The sidebar will say "Supabase" instead of "Demo data".
--
--  SAFE TO RUN TWICE. Every statement below is written so that re-running
--  this file changes nothing and fails nowhere. If you are not sure whether
--  it worked, just run it again.
--
--  ---------------------------------------------------------------
--  READ THIS BEFORE YOU PUT ANYTHING REAL IN HERE
--  ---------------------------------------------------------------
--  The Row Level Security policies at the bottom of this file allow demonstration
--  access so clients can read and write these five tables without credentials.
--  A production deployment would replace those policies with authenticated roles.
--
--  It is NOT suitable for anything real. A deployment would replace those
--  policies with per-user rules and put a genuine sign-in in front of the
--  app. There is a longer note where the policies are created.
--
--  ---------------------------------------------------------------
--  WHY THERE ARE FIVE TABLES AND NOT SEVEN
--  ---------------------------------------------------------------
--  The app also has LOCATIONS (the 12 stations, camps, vessels and runways)
--  and an ACTIVITY LOG. Neither is here, on purpose:
--
--    LOCATIONS are reference data. Nothing in the app ever edits them, and
--    keeping them in the code means the map and every dropdown still work
--    with no database at all — including when the database is unreachable
--    mid-demo. A table would add a network dependency and buy nothing.
--
--    THE ACTIVITY LOG is a running commentary on the current session. It is
--    generated from the changes you make while the console is open, so
--    storing it would mostly store a record of previous demos.
--
--  ---------------------------------------------------------------
--  A NOTE ON THE ID COLUMNS
--  ---------------------------------------------------------------
--  The keys are text — 'EXP-001', 'P-014', 'INC-003' — not numbers, because
--  those are the IDs a logistics officer actually says out loud. The app
--  generates the next one by counting the rows it can see, which is fine for
--  one operator and would need a proper sequence for several at once. Said
--  plainly because it is a real limitation, not a hidden one.
-- ============================================================


-- ============================================================
--  1. EXPEDITIONS
-- ============================================================
--  The CHECK constraints below are the same status words the app defines in
--  src/lib/statuses.js. Repeating them here means the database refuses a
--  status the app does not know about, so a typo in code becomes a loud
--  error at the moment of writing instead of a strange badge three screens
--  away. If you add a status word in statuses.js, add it here too.
create table if not exists expeditions (
  id           text primary key,
  name         text not null,
  destination  text,
  location_id  text,
  start_date   date,
  end_date     date,
  team_size    integer default 0,
  status       text not null default 'PLANNING'
               check (status in ('PLANNING', 'ACTIVE', 'COMPLETED', 'SUSPENDED')),
  progress     integer default 0 check (progress between 0 and 100),
  leader       text,
  objective    text,
  created_at   timestamptz default now()
);


-- ============================================================
--  2. PERSONNEL
-- ============================================================
--  latitude/longitude are ORDINARY COLUMNS, not a feed. They change when
--  somebody is reassigned in the app, and never on their own. This prototype
--  has no GPS, no beacons and no tracking of any kind, and the console says
--  so on every screen that shows a position.
--
--  expedition_id references expeditions with ON DELETE SET NULL: removing an
--  expedition must never delete the people who were on it. Their record
--  simply stops pointing at it.
create table if not exists personnel (
  id            text primary key,
  name          text not null,
  role          text,
  expedition_id text references expeditions (id) on delete set null,
  status        text not null default 'ACTIVE'
                check (status in ('ACTIVE', 'IN_TRANSIT', 'RESTING', 'EMERGENCY', 'OFF_DUTY')),
  location_id   text,
  latitude      double precision,
  longitude     double precision,
  last_updated  timestamptz default now(),
  blood_group   text,
  satphone      text
);


-- ============================================================
--  3. CARGO
-- ============================================================
--  delay_reason is the sentence someone types when a consignment goes
--  DELAYED. It is what turns a red badge into an explanation, so it is a
--  column and not an afterthought.
--
--  weight_kg is double precision rather than numeric on purpose. Postgres
--  numeric is arbitrary-precision, so the Supabase client hands it back as a
--  STRING to avoid losing digits — and "9600" is not a number the tonnage
--  totals on the Cargo page can add up. A crate weight does not need exact
--  decimal arithmetic, so the ordinary float type is both correct and the one
--  that arrives as a number.
create table if not exists cargo (
  id            text primary key,
  item_name     text not null,
  category      text,
  quantity      integer default 0,
  unit          text,
  location      text,
  destination   text,
  status        text not null default 'PLANNED'
                check (status in ('PLANNED', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'DELAYED')),
  priority      text not null default 'MEDIUM'
                check (priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  expedition_id text references expeditions (id) on delete set null,
  weight_kg     double precision,
  delay_reason  text,
  created_at    timestamptz default now()
);


-- ============================================================
--  4. INVENTORY
-- ============================================================
--  THERE IS NO low_stock COLUMN, AND THAT IS THE POINT.
--
--  Low stock is quantity <= minimum_quantity. The app works it out every
--  time it draws the screen (stockStatus() in src/lib/statuses.js). A stored
--  flag would be a second place claiming to know the answer, and the moment a
--  quantity changed without it being updated the badge and the dashboard
--  warning would disagree. The table holds the two numbers; the answer is
--  derived from them.
--
--  The view at the end of this file shows the same rule written in SQL, so
--  you can ask the database the question too.
create table if not exists inventory (
  id               text primary key,
  item_name        text not null,
  category         text,
  quantity         integer not null default 0 check (quantity >= 0),
  minimum_quantity integer not null default 0 check (minimum_quantity >= 0),
  unit             text,
  location         text,
  condition        text default 'GOOD'
                   check (condition in ('NEW', 'GOOD', 'SERVICEABLE', 'NEEDS_REPAIR', 'EXPIRED')),
  updated_at       timestamptz default now()
);


-- ============================================================
--  5. EMERGENCIES
-- ============================================================
--  acknowledged_at and resolved_at are stamped at the moment they happen and
--  cannot be worked out afterwards from anything else in the row. "How long
--  before somebody responded" is the critical response readiness metric,
--  and it exists only because these two columns do. They are the reason
--  this table is worth having in a database rather than a browser tab.
--
--  Writing a row here alerts NOBODY. There is no SMS, no satellite call and
--  no pager in this prototype. It makes an incident visible to whoever is
--  looking at the console, and that is the whole of it.
create table if not exists emergencies (
  id              text primary key,
  type            text not null default 'OTHER'
                  check (type in ('MEDICAL', 'EQUIPMENT_FAILURE', 'WEATHER',
                                  'OVERDUE_CHECKIN', 'FIRE', 'VEHICLE', 'OTHER')),
  location        text,
  location_id     text,
  latitude        double precision,
  longitude       double precision,
  severity        text not null default 'HIGH'
                  check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description     text,
  status          text not null default 'ACTIVE'
                  check (status in ('ACTIVE', 'RESPONDING', 'RESOLVED')),
  reported_at     timestamptz default now(),
  acknowledged_at timestamptz,
  resolved_at     timestamptz,
  assigned_team   text,
  response_note   text,
  personnel_id    text references personnel (id) on delete set null,
  expedition_id   text references expeditions (id) on delete set null
);


-- ============================================================
--  INDEXES
-- ============================================================
--  The three columns the app filters and sorts on most. With 65 rows these
--  change nothing measurable; they are here because the queries they support
--  are the ones that would still be run against 65,000.
create index if not exists personnel_expedition_idx  on personnel (expedition_id);
create index if not exists cargo_status_idx           on cargo (status);
create index if not exists emergencies_reported_idx   on emergencies (reported_at desc);


-- ============================================================
--  SEED DATA — the same demo records the app ships with
-- ============================================================
--  Generated from src/data/demoData.js by scripts/generate-schema.mjs, so
--  the database starts out identical to the offline demo and there is only
--  ever one copy of these facts to edit.
--
--  EVERY NAME, PHONE NUMBER, POSITION AND INCIDENT BELOW IS FICTIONAL.
--  The stations, coordinates and the 46th resupply campaign are real Indian
--  Antarctic context; the people and the events are invented for this
--  prototype. No real person's information appears anywhere in this project.
--
--  Order matters: expeditions first, then personnel, because cargo and
--  emergencies point at both. ON CONFLICT DO NOTHING on every block means
--  running this file again is harmless.
--
--  The timestamps below were fixed at the moment this file was generated, so
--  an incident that reads "2 hours ago" today will read "3 days ago" next
--  week. Regenerate with "node scripts/generate-schema.mjs" for a fresh set,
--  or just say so — a demo database with slightly old incidents in it is
--  more honest than one that pretends to be live.
-- ============================================================

-- expeditions: 5 rows
insert into expeditions (id, name, destination, location_id, start_date, end_date, team_size, status, progress, leader, objective, created_at) values
  ('EXP-001', 'Antarctica Research Alpha', 'Maitri Station', 'LOC-MAITRI', '2026-06-01', '2027-03-15', 24, 'ACTIVE', 68, 'Cdr. Vikram Rathore', 'Overwintering science programme: ice-core sampling, atmospheric monitoring, and pre-season depot build-up for the 46th resupply campaign.', '2026-01-25T05:48:40.504Z'),
  ('EXP-002', 'Bharati Coastal Survey', 'Bharati Station', 'LOC-BHARATI', '2026-07-15', '2027-02-28', 18, 'ACTIVE', 41, 'Dr. Ananya Bose', 'Lake-sediment coring across the Larsemann Hills, coastal bathymetry, and krill population survey with ORV Sagar Nidhi.', '2026-03-11T05:48:40.504Z'),
  ('EXP-003', 'Himadri Arctic Glaciology', 'Himadri Station', 'LOC-HIMADRI', '2026-06-10', '2026-09-30', 12, 'ACTIVE', 82, 'Dr. Ingrid Halvorsen', 'Kongsvegen glacier mass-balance measurement, permafrost borehole logging, and ground-penetrating radar transects.', '2026-02-14T05:48:40.504Z'),
  ('EXP-004', 'Southern Ocean Hydrography Leg III', 'ORV Sagar Nidhi', 'LOC-VSL-SN', '2026-01-10', '2026-04-22', 21, 'ACTIVE', 88, 'Dr. Sofia Ramirez', 'CTD transects, acoustic bathymetry, and water-column sampling between 40°S and the Antarctic Circumpolar Current with ORV Sagar Nidhi.', '2025-09-17T05:48:40.504Z'),
  ('EXP-005', '46th Antarctic Resupply Campaign', 'Maitri Station', 'LOC-MAITRI', '2026-11-05', '2027-04-10', 30, 'ACTIVE', 28, 'Sgt. Harpreet Singh', 'Annual summer resupply: fuel transfer, waste back-load, station maintenance, and personnel rotation via Cape Town and Novo Runway.', '2026-07-06T05:48:40.504Z')
on conflict (id) do nothing;

-- personnel: 24 rows
insert into personnel (id, name, role, expedition_id, status, location_id, latitude, longitude, last_updated, blood_group, satphone) values
  ('P-001', 'Dr. Arjun Sharma', 'Scientist', 'EXP-001', 'ACTIVE', 'LOC-MAITRI', -70.7667, 11.7333, '2026-08-23T05:36:40.504Z', 'B+', '+881-621-440-101'),
  ('P-002', 'Cdr. Vikram Rathore', 'Station Commander', 'EXP-001', 'ACTIVE', 'LOC-MAITRI', -70.7671, 11.7349, '2026-08-23T05:42:40.504Z', 'O+', '+881-621-440-102'),
  ('P-003', 'Dr. Meera Iyer', 'Medical Officer', 'EXP-001', 'ACTIVE', 'LOC-MAITRI', -70.7659, 11.7318, '2026-08-23T05:45:40.504Z', 'A+', '+881-621-440-103'),
  ('P-005', 'Dr. Lena Kowalski', 'Atmospheric Physicist', 'EXP-001', 'RESTING', 'LOC-MAITRI', -70.7663, 11.7341, '2026-08-23T00:48:40.504Z', 'AB+', '+881-621-440-105'),
  ('P-006', 'Tenzin Norbu', 'Field Guide', 'EXP-001', 'ACTIVE', 'LOC-CAMP-SCH', -70.7412, 11.6021, '2026-08-23T05:26:40.504Z', 'O-', '+881-621-440-106'),
  ('P-007', 'Dr. Rohan Desai', 'Geologist', 'EXP-001', 'EMERGENCY', 'LOC-CAMP-SCH', -70.7455, 11.5874, '2026-08-23T04:14:40.504Z', 'A-', '+881-621-440-107'),
  ('P-021', 'Havildar Manpreet Verma', 'Station Logistics Tech', 'EXP-001', 'ACTIVE', 'LOC-MAITRI', -70.7674, 11.7328, '2026-08-23T05:10:40.504Z', 'B+', '+881-621-440-108'),
  ('P-008', 'Dr. Ananya Bose', 'Station Commander', 'EXP-002', 'ACTIVE', 'LOC-BHARATI', -69.4067, 76.1867, '2026-08-23T05:39:40.504Z', 'B-', '+881-621-440-208'),
  ('P-009', 'Dr. Kwame Mensah', 'Marine Biologist', 'EXP-002', 'ACTIVE', 'LOC-BHARATI', -69.4055, 76.1902, '2026-08-23T05:31:40.504Z', 'O+', '+881-621-440-209'),
  ('P-010', 'Priya Nandakumar', 'Communications Engineer', 'EXP-002', 'ACTIVE', 'LOC-BHARATI', -69.4071, 76.1855, '2026-08-23T05:44:40.504Z', 'A+', '+881-621-440-210'),
  ('P-011', 'Dr. Kavita Shenoy', 'Marine Ecologist', 'EXP-002', 'IN_TRANSIT', 'LOC-CAMP-LAR', -69.3968, 76.2255, '2026-08-23T05:15:40.504Z', 'AB-', '+881-621-440-211'),
  ('P-012', 'Manoj Pillai', 'Power Systems Technician', 'EXP-002', 'RESTING', 'LOC-BHARATI', -69.4062, 76.1879, '2026-08-22T22:48:40.504Z', 'B+', '+881-621-440-212'),
  ('P-013', 'Dr. Ingrid Halvorsen', 'Glaciologist', 'EXP-003', 'ACTIVE', 'LOC-HIMADRI', 78.9167, 11.9333, '2026-08-23T05:33:40.504Z', 'O+', '+881-621-440-313'),
  ('P-014', 'Dr. Sameer Qureshi', 'Remote Sensing Lead', 'EXP-003', 'ACTIVE', 'LOC-CAMP-KVG', 78.8021, 12.9855, '2026-08-23T05:20:40.504Z', 'A+', '+881-621-440-314'),
  ('P-015', 'Aditi Verma', 'Field Technician', 'EXP-003', 'IN_TRANSIT', 'LOC-CAMP-KVG', 78.8604, 12.4471, '2026-08-23T04:56:40.504Z', 'B+', '+881-621-440-315'),
  ('P-016', 'Dr. Yuki Tanaka', 'Permafrost Researcher', 'EXP-003', 'OFF_DUTY', 'LOC-HIMADRI', 78.9201, 11.9411, '2026-08-22T05:48:40.504Z', 'A-', '+881-621-440-316'),
  ('P-017', 'Dr. Sofia Ramirez', 'Expedition Leader & Oceanographer', 'EXP-004', 'ACTIVE', 'LOC-VSL-SN', -48.214, 32.418, '2026-08-23T05:30:40.504Z', 'AB-', '+881-621-440-417'),
  ('P-018', 'Capt. Rajesh Nair', 'Vessel Operations Master', 'EXP-004', 'ACTIVE', 'LOC-VSL-SN', -48.2145, 32.421, '2026-08-23T05:12:40.504Z', 'O+', '+881-621-440-418'),
  ('P-019', 'Elena Rostova', 'Hydrographic Surveyor', 'EXP-004', 'ACTIVE', 'LOC-VSL-SN', -48.2135, 32.415, '2026-08-23T04:54:40.504Z', 'A+', '+881-621-440-419'),
  ('P-020', 'Marcus Vance', 'CTD Marine Systems Tech', 'EXP-004', 'RESTING', 'LOC-VSL-SN', -48.2138, 32.4195, '2026-08-22T23:48:40.504Z', 'B+', '+881-621-440-420'),
  ('P-004', 'Sgt. Harpreet Singh', 'Resupply Logistics Commander', 'EXP-005', 'IN_TRANSIT', 'LOC-NOVO', -70.8102, 11.7904, '2026-08-23T05:07:40.504Z', 'B+', '+881-621-440-104'),
  ('P-022', 'Subedar Jasbir Sandhu', 'Fuel Systems Specialist', 'EXP-005', 'ACTIVE', 'LOC-MAITRI', -70.768, 11.732, '2026-08-23T05:05:40.504Z', 'O+', '+881-621-440-522'),
  ('P-023', 'Neha Kulkarni', 'Cold-Chain Cargo Coordinator', 'EXP-005', 'ACTIVE', 'LOC-NOVO', -70.8115, 11.792, '2026-08-23T05:22:40.504Z', 'A+', '+881-621-440-523'),
  ('P-024', 'Vikram Solanki', 'Traverse Vehicle Engineer', 'EXP-005', 'ACTIVE', 'LOC-NOVO', -70.809, 11.788, '2026-08-23T04:59:40.504Z', 'AB+', '+881-621-440-524')
on conflict (id) do nothing;

-- cargo: 14 rows
insert into cargo (id, item_name, category, quantity, unit, location, destination, status, priority, expedition_id, weight_kg, delay_reason, created_at) values
  ('C-101', 'Diesel Fuel Drums (200 L)', 'Fuel', 48, 'drums', 'Novo Runway', 'Maitri Station', 'IN_TRANSIT', 'HIGH', 'EXP-001', 9600, null, '2026-08-14T05:48:40.504Z'),
  ('C-102', 'Medical Supplies', 'Medical', 50, 'units', 'MV Polar Pioneer', 'Maitri Station', 'IN_TRANSIT', 'HIGH', 'EXP-001', 340, null, '2026-08-09T05:48:40.504Z'),
  ('C-103', 'Ice Core Drilling Rig', 'Scientific Equipment', 1, 'unit', 'Cape Town Staging Port', 'Maitri Station', 'LOADED', 'CRITICAL', 'EXP-001', 1450, null, '2026-08-02T05:48:40.504Z'),
  ('C-104', 'Ration Packs (14-day)', 'Food', 320, 'packs', 'Maitri Station', 'Schirmacher Field Camp', 'ARRIVED', 'MEDIUM', 'EXP-001', 1280, null, '2026-08-17T05:48:40.504Z'),
  ('C-105', 'Generator Spare Parts', 'Spares', 12, 'sets', 'Novo Runway', 'Maitri Station', 'DELAYED', 'CRITICAL', 'EXP-001', 610, 'Grounded at Novo — sustained crosswinds above rotary-wing limits.', '2026-08-12T05:48:40.504Z'),
  ('C-106', 'Cold Weather Sleeping Systems', 'Safety', 30, 'units', 'Cape Town Staging Port', 'Bharati Station', 'IN_TRANSIT', 'MEDIUM', 'EXP-002', 420, null, '2026-08-06T05:48:40.504Z'),
  ('C-107', 'Automatic Weather Station Kit', 'Scientific Equipment', 2, 'units', 'Bharati Station', 'Larsemann Field Camp', 'PLANNED', 'HIGH', 'EXP-002', 180, null, '2026-08-20T05:48:40.504Z'),
  ('C-108', 'Freshwater Desalination Filters', 'Utility', 24, 'units', 'ORV Sagar Nidhi', 'Bharati Station', 'IN_TRANSIT', 'HIGH', 'EXP-002', 96, null, '2026-08-15T05:48:40.504Z'),
  ('C-109', 'CTD Rosette Sensor Array', 'Scientific Equipment', 1, 'unit', 'ORV Sagar Nidhi', 'Bharati Station', 'ARRIVED', 'MEDIUM', 'EXP-002', 520, null, '2026-07-28T05:48:40.504Z'),
  ('C-110', 'Snowmobile Fuel & Lubricants', 'Fuel', 40, 'cans', 'Himadri Station', 'Kongsvegen Glacier Camp', 'IN_TRANSIT', 'MEDIUM', 'EXP-003', 800, null, '2026-08-19T05:48:40.504Z'),
  ('C-111', 'GPR Survey Equipment', 'Scientific Equipment', 3, 'units', 'Himadri Station', 'Kongsvegen Glacier Camp', 'ARRIVED', 'HIGH', 'EXP-003', 210, null, '2026-08-04T05:48:40.504Z'),
  ('C-112', 'Satellite Comms Terminal', 'Communications', 2, 'units', 'Himadri Station', 'Kongsvegen Glacier Camp', 'PLANNED', 'HIGH', 'EXP-003', 64, null, '2026-08-21T05:48:40.504Z'),
  ('C-113', 'Emergency Shelter Modules', 'Safety', 6, 'units', 'Cape Town Staging Port', 'Maitri Station', 'PLANNED', 'CRITICAL', 'EXP-005', 2100, null, '2026-08-18T05:48:40.504Z'),
  ('C-114', 'Laboratory Consumables', 'Scientific Equipment', 180, 'units', 'NCPOR Headquarters', 'Cape Town Staging Port', 'LOADED', 'LOW', 'EXP-005', 310, null, '2026-08-16T05:48:40.504Z')
on conflict (id) do nothing;

-- inventory: 14 rows
insert into inventory (id, item_name, category, quantity, minimum_quantity, unit, location, condition, updated_at) values
  ('I-001', 'Food Supplies (dry rations)', 'Food', 120, 100, 'packs', 'Maitri Station', 'GOOD', '2026-08-23T02:48:40.504Z'),
  ('I-002', 'Medical Kits', 'Medical', 18, 25, 'kits', 'Maitri Station', 'GOOD', '2026-08-23T03:48:40.504Z'),
  ('I-003', 'Diesel Fuel', 'Fuel', 14200, 6000, 'litres', 'Maitri Station', 'GOOD', '2026-08-22T23:48:40.504Z'),
  ('I-004', 'Trauma / Frostbite Kits', 'Medical', 4, 8, 'kits', 'Schirmacher Field Camp', 'GOOD', '2026-08-23T04:20:40.504Z'),
  ('I-005', 'Avalanche Beacons', 'Safety', 8, 8, 'units', 'Schirmacher Field Camp', 'SERVICEABLE', '2026-08-21T05:48:40.504Z'),
  ('I-006', 'Cold Weather Sleeping Bags', 'Safety', 26, 12, 'units', 'Maitri Station', 'GOOD', '2026-08-19T05:48:40.504Z'),
  ('I-007', 'LPG Cylinders', 'Fuel', 9, 15, 'cylinders', 'Bharati Station', 'GOOD', '2026-08-22T18:48:40.504Z'),
  ('I-008', 'Potable Water Reserve', 'Utility', 8600, 3000, 'litres', 'Bharati Station', 'GOOD', '2026-08-23T04:48:40.504Z'),
  ('I-009', 'Oxygen Cylinders (medical)', 'Medical', 11, 6, 'cylinders', 'Bharati Station', 'NEW', '2026-08-18T05:48:40.504Z'),
  ('I-010', 'Snowmobile Spare Tracks', 'Spares', 3, 4, 'sets', 'Himadri Station', 'NEEDS_REPAIR', '2026-08-20T05:48:40.504Z'),
  ('I-011', 'Ration Packs (14-day)', 'Food', 210, 90, 'packs', 'Himadri Station', 'GOOD', '2026-08-22T20:48:40.504Z'),
  ('I-012', 'Satellite Phone Batteries', 'Communications', 22, 10, 'units', 'Himadri Station', 'GOOD', '2026-08-22T05:48:40.504Z'),
  ('I-013', 'Generator Engine Oil', 'Spares', 140, 60, 'litres', 'Maitri Station', 'GOOD', '2026-08-22T15:48:40.504Z'),
  ('I-014', 'Sample Storage Cryo-vials', 'Scientific', 640, 250, 'units', 'Bharati Station', 'NEW', '2026-08-17T05:48:40.504Z')
on conflict (id) do nothing;

-- emergencies: 4 rows
insert into emergencies (id, type, location, location_id, latitude, longitude, severity, description, status, reported_at, acknowledged_at, resolved_at, assigned_team, response_note, personnel_id, expedition_id) values
  ('INC-001', 'MEDICAL', 'Maitri Sector B', 'LOC-MAITRI', -70.7455, 11.5874, 'HIGH', 'Suspected ankle fracture during traverse sampling. Casualty conscious and sheltered. Requesting rotary-wing evacuation to Maitri medical bay.', 'ACTIVE', '2026-08-23T04:14:40.504Z', null, null, 'Maitri Rapid Response Alpha', null, 'P-007', 'EXP-001'),
  ('INC-002', 'EQUIPMENT_FAILURE', 'Bharati Power Module 2', 'LOC-BHARATI', -69.4071, 76.1855, 'MEDIUM', 'Primary generator tripped on overtemperature. Station running on backup unit at reduced load. Non-essential lab circuits shed.', 'RESPONDING', '2026-08-22T20:48:40.504Z', '2026-08-22T21:10:40.504Z', null, 'Bharati Technical Team', null, 'P-012', 'EXP-002'),
  ('INC-003', 'WEATHER', 'Kongsvegen Glacier Camp', 'LOC-CAMP-KVG', 78.8021, 12.9855, 'HIGH', 'Rapid visibility drop with gusts above 60 km/h. Field party sheltering in camp; glacier transects suspended until conditions ease.', 'RESPONDING', '2026-08-23T00:48:40.504Z', '2026-08-23T00:56:40.504Z', null, 'Himadri Field Safety Unit', null, 'P-014', 'EXP-003'),
  ('INC-004', 'OVERDUE_CHECKIN', 'Larsemann Ridge Route', 'LOC-CAMP-LAR', -69.3968, 76.2255, 'LOW', 'Scheduled 18:00 check-in missed by 40 minutes. Contact re-established; cause was a depleted radio battery. No injuries.', 'RESOLVED', '2026-08-21T05:48:40.504Z', '2026-08-21T05:53:40.504Z', '2026-08-21T06:29:40.504Z', 'Bharati Search Team', null, 'P-011', 'EXP-002')
on conflict (id) do nothing;


-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
--  Supabase turns RLS on for every new table, and with it on and no policy
--  written, the anon key can read NOTHING. Importantly, that failure is
--  SILENT: a SELECT does not error, it just returns zero rows. An app that
--  suddenly shows empty tables with no error message has almost always hit
--  exactly this. So the policies below are not optional — without them the
--  console connects successfully and shows you nothing.
--
--  ---------------------------------------------------------------
--  WHAT THESE POLICIES ACTUALLY ALLOW — SAY THIS OUT LOUD IF ASKED
--  ---------------------------------------------------------------
--  Anyone who has your project URL and anon key can read and change these
--  five tables. There is no per-user restriction of any kind. The app's own
--  role selector hides buttons in the browser, and that prevents mistakes —
--  it does not stop anybody, because a browser is not a security boundary.
--
--  This is an acceptable trade for a prototype containing invented data, and
--  it is written down here rather than left for someone to discover.
--
--  A real NCPOR deployment would: put genuine sign-in in front of the app,
--  replace 'using (true)' with rules based on auth.uid() and a role column,
--  and keep writes to emergencies auditable. That work is real work, and
--  claiming this file does it would be the dishonest part.
-- ============================================================

alter table expeditions enable row level security;
alter table personnel   enable row level security;
alter table cargo       enable row level security;
alter table inventory   enable row level security;
alter table emergencies enable row level security;

-- One open policy per table. DROP first so this file stays re-runnable —
-- CREATE POLICY has no "if not exists" form.
drop policy if exists demo_all_expeditions on expeditions;
create policy demo_all_expeditions on expeditions for all using (true) with check (true);

drop policy if exists demo_all_personnel on personnel;
create policy demo_all_personnel on personnel for all using (true) with check (true);

drop policy if exists demo_all_cargo on cargo;
create policy demo_all_cargo on cargo for all using (true) with check (true);

drop policy if exists demo_all_inventory on inventory;
create policy demo_all_inventory on inventory for all using (true) with check (true);

drop policy if exists demo_all_emergencies on emergencies;
create policy demo_all_emergencies on emergencies for all using (true) with check (true);


-- ============================================================
--  THE LOW-STOCK RULE, WRITTEN IN SQL
-- ============================================================
--  The app derives stock status from the two numbers rather than storing it.
--  This view is that same rule expressed once for the database, so you can
--  ask Postgres the question and get the answer the screen is showing:
--
--      select * from inventory_stock_status where stock_status <> 'AVAILABLE';
--
--  It is a VIEW, not a column: there is still nothing stored that could go
--  stale, and there is still only one definition of "low".
create or replace view inventory_stock_status as
select
  id,
  item_name,
  location,
  quantity,
  minimum_quantity,
  case
    when quantity = 0                  then 'OUT_OF_STOCK'
    when quantity <= minimum_quantity  then 'LOW_STOCK'
    else 'AVAILABLE'
  end as stock_status
from inventory;


-- ============================================================
--  START OVER  (deliberately commented out)
-- ============================================================
--  If you want to wipe the five tables and run this file fresh, uncomment
--  the five lines below, run them once, then comment them out again.
--
--  THEY DELETE EVERYTHING IN THOSE TABLES WITH NO UNDO. That is why they are
--  commented out rather than left ready to fire.
--
--  drop view  if exists inventory_stock_status;
--  drop table if exists emergencies;
--  drop table if exists cargo;
--  drop table if exists personnel;
--  drop table if exists inventory;
--  drop table if exists expeditions;
