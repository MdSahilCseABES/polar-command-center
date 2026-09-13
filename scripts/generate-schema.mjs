/**
 * ONE-OFF GENERATOR for supabase/schema.sql
 * =========================================
 * Run with:  node scripts/generate-schema.mjs
 *
 * WHY THIS EXISTS instead of a hand-written .sql file:
 *   The seed rows at the bottom of schema.sql are the SAME 65 records the app
 *   already uses as demo data. Typing them out a second time would create two
 *   copies of the same facts that drift apart the moment either is edited —
 *   the exact mistake this whole project is built to avoid. So the SQL is
 *   generated FROM src/data/demoData.js, and if you change the demo data you
 *   re-run this and the SQL follows.
 *
 * You never need to run this to use the app. It is a development tool; the
 * file it produces (supabase/schema.sql) is the thing you actually use.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import demoData from '../src/data/demoData.js'

/* ---------- turning JavaScript values into SQL literals ---------- */

function sqlValue(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  /* Doubling the apostrophe is how SQL escapes it: 'India''s station'. */
  return `'${String(value).replace(/'/g, "''")}'`
}

function insertStatements(table, columns, rows) {
  const columnList = columns.join(', ')
  const values = rows
    .map((row) => `  (${columns.map((c) => sqlValue(row[c] ?? null)).join(', ')})`)
    .join(',\n')

  /* ON CONFLICT DO NOTHING makes the whole file safe to run twice. Without
     it, a second run fails on the first duplicate ID and you are left
     wondering which half of the script actually applied. */
  return `insert into ${table} (${columnList}) values\n${values}\non conflict (id) do nothing;\n`
}

const TABLES = {
  expeditions: [
    'id', 'name', 'destination', 'location_id', 'start_date', 'end_date',
    'team_size', 'status', 'progress', 'phase', 'leader', 'objective', 'created_at',
  ],
  personnel: [
    'id', 'name', 'role', 'affiliation', 'responsibility', 'readiness', 'expedition_id', 'status', 'location_id',
    'latitude', 'longitude', 'last_updated', 'blood_group', 'satphone',
  ],
  cargo: [
    'id', 'item_name', 'category', 'quantity', 'unit', 'location',
    'destination', 'status', 'priority', 'expedition_id', 'weight_kg',
    'transport_mode', 'route', 'delay_reason', 'created_at',
  ],
  inventory: [
    'id', 'item_name', 'category', 'quantity', 'minimum_quantity', 'reorder_trigger', 'unit',
    'location', 'condition', 'updated_at',
  ],
  emergencies: [
    'id', 'type', 'title', 'location', 'location_id', 'latitude', 'longitude',
    'severity', 'scenario', 'protocol', 'description', 'status', 'reported_at', 'acknowledged_at',
    'resolved_at', 'assigned_team', 'response_note', 'personnel_id',
    'expedition_id',
  ],
}

const header = `-- ============================================================
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
  phase        text,
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
  id             text primary key,
  name           text not null,
  role           text,
  affiliation    text,
  responsibility text,
  readiness      text,
  expedition_id  text references expeditions (id) on delete set null,
  status         text not null default 'ACTIVE'
                 check (status in ('ACTIVE', 'IN_TRANSIT', 'RESTING', 'EMERGENCY', 'OFF_DUTY')),
  location_id    text,
  latitude       double precision,
  longitude      double precision,
  last_updated   timestamptz default now(),
  blood_group    text,
  satphone       text
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
  id             text primary key,
  item_name      text not null,
  category       text,
  quantity       integer default 0,
  unit           text,
  location       text,
  destination    text,
  status         text not null default 'PLANNED'
                 check (status in ('PLANNED', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'DELAYED')),
  priority       text not null default 'MEDIUM'
                 check (priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  expedition_id  text references expeditions (id) on delete set null,
  weight_kg      double precision,
  transport_mode text,
  route          text,
  delay_reason   text,
  created_at     timestamptz default now()
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
  reorder_trigger  integer,
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
  title           text,
  location        text,
  location_id     text,
  latitude        double precision,
  longitude       double precision,
  severity        text not null default 'HIGH'
                  check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  scenario        text,
  protocol        text,
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
`

const seedHeader = `

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
`

const footer = `

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
`

/* ---------- assemble ---------- */

const seedOrder = ['expeditions', 'personnel', 'cargo', 'inventory', 'emergencies']
const seedBlocks = seedOrder.map((table) => {
  const rows = demoData[table]
  return `\n-- ${table}: ${rows.length} rows\n${insertStatements(table, TABLES[table], rows)}`
})

const sql = header + seedHeader + seedBlocks.join('') + footer

mkdirSync(new URL('../supabase/', import.meta.url), { recursive: true })
writeFileSync(new URL('../supabase/schema.sql', import.meta.url), sql, 'utf8')

const total = seedOrder.reduce((sum, t) => sum + demoData[t].length, 0)
console.log(`Wrote supabase/schema.sql — 5 tables, ${total} seed rows, ${sql.split('\n').length} lines.`)
