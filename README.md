# POLAR COMMAND CENTER

**Integrated Polar Expedition Logistics & Asset Management System**

National Polar Operations Platform
Ministry of Earth Sciences (MoES) · National Centre for Polar and Ocean Research (NCPOR)
Category: Mission Operations Software

---

## 1. Project overview

Running a polar research station means keeping track of four things at once: **who is
deployed, what is in transit, what is running out, and what has gone wrong.** Today those
four things usually live in four different places — a spreadsheet, a logbook, a WhatsApp
group, a radio call. When something goes wrong, somebody has to phone around to assemble
the picture.

POLAR COMMAND CENTER is one console that holds all four. It is a single-screen operations
dashboard with eight modules, built to show that expedition planning, personnel, cargo,
inventory and emergency response are the *same* problem and belong in the *same* system.

### The one thing to notice: the modules are connected

This is the heart of the project, and it is what the demo is built around. The modules are
not eight separate CRUD screens that happen to share a sidebar. They read the same records,
so a change in one is immediately visible in the others:

| You do this | These update on their own |
|---|---|
| Report an emergency | The sidebar alert count rises · the incident appears on the dashboard banner · the affected person's status flips to **EMERGENCY** · their map marker turns red |
| Mark a consignment delayed | The Cargo delay count rises · the dashboard "in transit" figures change |
| Take stock below its minimum | The item becomes **LOW STOCK** · the sidebar warning count rises · the dashboard low-stock card changes |
| Resolve an incident | The alert count falls · the person is released back to **ACTIVE** |

Nothing in that table is typed in twice. Every number is **calculated from the records**,
never stored as its own field — so no counter can ever drift out of step with reality.

### What is real and what is simulated

A prototype should be honest about its own edges, so this is stated plainly here, on the
login screen, and permanently in the sidebar footer:

- **Positions are simulated.** The coordinates are realistic fixed demo values for Indian
  polar stations and camps. There is **no real GPS or beacon tracking** in this project.
- **Weather is genuinely live** — fetched from the Open-Meteo public API. If the API cannot
  be reached, the app shows clearly-labelled fallback figures and says so on screen. It
  never presents demo numbers as live readings.
- **Records live in the browser by default** and reset when you refresh. Connect the
  optional Supabase database and they persist — the sidebar footer always tells you which
  of the two is currently true.
- **The login is a role picker, not security.** It decides which controls appear. It is not
  an authentication system and does not pretend to be.
- **Names are fictional.** No real person's information is used anywhere.

This is a **working prototype**, not a production system.

---

## 2. Features

**Dashboard** — Live overview: active expeditions, personnel deployed, cargo in transit,
low-stock items and critical alerts, plus an open-incident banner and an activity feed.
Every card is clickable and takes you to the module behind the number.

**Expedition Management** — All five expeditions with status (Planning / Active /
Completed), progress, leader, window and objective. Create, edit and delete.

**Personnel Tracking** — A 16-person roster with role, assigned expedition, current
location, status and last-updated time. Filter and search; change a person's status
inline; open a detail panel with their position on the map.

**Cargo Tracking** — 14 consignments with category, weight, priority and pipeline status
(Staged → In Transit → Arrived, or Delayed with a reason). Filter by status, category and
priority — the three filters from the brief.

**Inventory Management** — 14 stock items across four locations, each with a minimum
level. Anything at or below its minimum is flagged **LOW STOCK** automatically — the flag
is computed, not a column somebody has to remember to tick. Includes a stock-by-category
chart and quick +/− stock adjustment.

**Weather Integration** — Live conditions and a 4-day forecast for 10 stations and camps
from Open-Meteo, with an **operations window** assessment (is it safe to fly, drive, or work
outside?) and a one-click "report this as a weather hazard" action.

**Map Integration** — An interactive Leaflet / OpenStreetMap view plotting all 12 sites,
16 personnel and every open incident, colour-coded by status, with a detail panel per
marker.

**Emergency Response** — A prominent alert section, an incident report form with
validation, and a triage board where incidents are acknowledged and resolved. Filed
incidents flow straight to the dashboard and the roster (see the table above).

**Throughout** — Four roles, responsive layout down to phone width, and loading /
empty / error states on every data view, so a failed request never blanks the screen or
crashes the console.

---

## 3. Technology stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **React 18.3.1** | Component reuse across eight modules |
| Build tool | **Vite 8.2.2** | Instant dev server and fast builds |
| Language | **JavaScript** (not TypeScript) | Fewer moving parts to explain |
| Styling | **Tailwind CSS 3.4.17** | Consistent spacing and colour without a separate CSS file per component |
| Database *(optional)* | **Supabase** (`@supabase/supabase-js` 2.112) | Hosted Postgres with a free tier and no backend to write |
| Maps | **Leaflet 1.9.4** + OpenStreetMap | Free, no API key, no billing account |
| Weather | **Open-Meteo** | Free, no API key, no sign-up |
| Charts | **Recharts 2.13.3** | Charts as React components |
| Icons | **Lucide React 0.468** | One clean icon set |

**There is deliberately no backend server.** Supabase is reached directly from the browser,
so there is no Express app, no Docker, no deployment pipeline — one command runs everything.

---

## 4. Project structure

```
polar-expedition-prototype/
├── index.html                  Page shell that loads the app
├── package.json                Dependencies and the npm scripts
├── vite.config.js              Build configuration
├── tailwind.config.js          Design tokens (colours, fonts)
├── .env.example                Template for your keys — safe to commit
├── .gitignore                  Keeps .env and node_modules out of git
│
├── src/
│   ├── main.jsx                Entry point; wraps the app in its two providers
│   ├── App.jsx                 Layout, sign-in gate, and which page is shown
│   ├── index.css               Design system: colours, cards, tables, badges
│   │
│   ├── pages/                  ONE FILE PER MODULE — start reading here
│   │   ├── Login.jsx           Role picker
│   │   ├── Dashboard.jsx       Module 1
│   │   ├── Expeditions.jsx     Module 2
│   │   ├── Personnel.jsx       Module 3
│   │   ├── Cargo.jsx           Module 4
│   │   ├── Inventory.jsx       Module 5
│   │   ├── Weather.jsx         Module 6
│   │   ├── MapView.jsx         Module 7
│   │   └── Emergency.jsx       Module 8
│   │
│   ├── components/             Reused pieces: DataTable, StatCard, Badge,
│   │                           Panel, Sidebar, TopBar, ErrorBoundary, charts
│   │
│   ├── store/
│   │   ├── DataContext.jsx     THE HEART OF THE PROJECT. All records live
│   │   │                       here, so every module reads the same data —
│   │   │                       this is what makes the modules connected.
│   │   └── AuthContext.jsx     Who is signed in and what they may change
│   │
│   ├── services/               All API and database code — kept out of the UI
│   │   ├── db.js               Thin Supabase wrapper; never throws
│   │   ├── weatherService.js   Open-Meteo calls
│   │   └── …Service.js         One per table (expedition, personnel, cargo,
│   │                           inventory, emergency)
│   │
│   ├── lib/
│   │   ├── supabase.js         Reads the keys; returns null if absent
│   │   ├── statuses.js         Every status word, in one place
│   │   ├── roles.js            The four roles and their permissions
│   │   ├── format.js           Date and number formatting
│   │   └── navigation.js       The sidebar menu definition
│   │
│   └── data/
│       └── demoData.js         The built-in demo records (see below)
├── supabase/
│   └── schema.sql              The whole database in one file — paste and run
├── scripts/
│   └── generate-schema.mjs     Regenerates schema.sql from demoData.js
└── legacy/                     The original v1 Express prototype, archived
```

**Demo data** (`src/data/demoData.js`): 5 expeditions, 16 personnel, 14 consignments,
14 inventory items, 4 incidents, 12 locations (10 land sites + 2 vessels) and 8 activity
entries — all fictional, all realistic for Indian polar operations (Maitri, Bharati,
Himadri and their field camps).

---

## 5. Installation

**You need [Node.js](https://nodejs.org/)** version `20.19+` or `22.12+` (this project was
built on Node 22). Check what you have:

```bash
node -v
```

Then, in a terminal, go into the project folder and install the dependencies:

```bash
cd polar-expedition-prototype
```

```bash
npm install
```

That downloads everything listed in `package.json` into a `node_modules` folder. It takes a
minute or two the first time and only needs doing once.

---

## 6. Environment variables

**You can skip this entire section.** The app runs fully on its built-in demo data with no
keys at all — that is its normal, intended state, and it is how you should demo it.

If you *do* want the optional database, the app reads exactly two variables:

| Variable | What it is |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase **anon public** key |

Rules that matter:

- Keys go in a file named **`.env`** in the project root — **never** in the source code.
- `.env` is already listed in `.gitignore`, so it can never be committed to GitHub.
- `.env.example` is the committed template. It contains no real keys and explains where
  each value comes from. Copy it to start:

```bash
cp .env.example .env
```

- The name **must** start with `VITE_`. Vite only exposes variables to the browser if they
  carry that prefix.
- Use the **anon public** key only. It is designed to be visible in a browser. Never put
  the `service_role` key in this app — that one is a secret.
- Restart the dev server after editing `.env`.

No weather key is needed. Open-Meteo is free and requires no sign-up.

---

## 7. Supabase setup

*Optional. Skip it and everything still works.*

1. Go to **[supabase.com](https://supabase.com)** and sign up — free, no card needed.
2. Click **New project**. Give it any name and a strong database password.
3. Wait about two minutes for it to finish setting up.
4. In the left sidebar click the **gear icon** (Project Settings) → **API**.
5. Copy **Project URL** → paste after `VITE_SUPABASE_URL=` in your `.env`.
6. Copy the **anon** / **public** key → paste after `VITE_SUPABASE_ANON_KEY=`.
7. Run the database setup in the next section, then restart the dev server.

**How to tell whether it worked:** look at the bottom of the sidebar. It reads either
*"Records in browser memory — reset on refresh"* or *"Records from Supabase — changes are
saved."* That line reports what actually happened, not merely whether keys are present — so
if a connection fails, it keeps telling you the truth.

If the database cannot be reached, the app **does not break**. It falls back to demo data,
every module keeps working, and an amber strip appears explaining what went wrong with a
**Retry** button.

---

## 8. Database setup

Everything is in one file: **`supabase/schema.sql`**.

1. In your Supabase project, open **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open `supabase/schema.sql`, copy **all** of it, paste it in.
4. Click **Run**.

That single file creates:

- **5 tables** — `expeditions`, `personnel`, `cargo`, `inventory`, `emergencies`
- **CHECK constraints** mirroring `src/lib/statuses.js`, so the database rejects any status
  word the app does not use
- **53 seed rows** — the same demo records, so the app looks identical connected or not
- **1 view** — `inventory_stock_status`, which *calculates* low stock. There is deliberately
  **no `low_stock` column**: a stored flag can go stale, a calculated one cannot
- **Row Level Security policies**

⚠️ **The demo RLS policies are wide open** — anyone with the anon key can read and write.
That is deliberate for a prototype with no real accounts, and it is stated in the SQL file
itself. A production system would replace them with login-based policies.

The SQL is *generated* from `src/data/demoData.js`, so the demo records exist in exactly one
place and cannot drift. If you edit the demo data, regenerate it:

```bash
node scripts/generate-schema.mjs
```

---

## 9. Running locally

Start the development server:

```bash
npm run dev
```

Open the address it prints — normally **http://localhost:5173**. Pick a role, click
**Enter Console**, and you are in.

Other commands:

```bash
npm run build
```

Bundles the app into a `dist/` folder for hosting.

```bash
npm run preview
```

Serves that built folder, so you can check the production build before presenting.

---

## 10. API integrations

### Open-Meteo — weather (live)

- Endpoint: `https://api.open-meteo.com/v1/forecast`
- **No API key, no sign-up, no billing account.** Free for non-commercial use.
- Called from `src/services/weatherService.js`; the UI never calls it directly.
- Fetches, for all 10 sites in a single request: temperature and apparent ("feels like")
  temperature, humidity, precipitation, surface pressure, wind speed, wind direction and
  wind gusts — plus a 4-day forecast of highs, lows, maximum wind and precipitation.
- The app turns those raw numbers into an **operations window** — a plain-language operational assessment
  about whether flying, driving or outdoor work is advisable.
- **If the call fails**, the page shows clearly-labelled fallback figures and says on screen
  that they are not live readings. This is the honest-handling requirement, not an
  afterthought.

### OpenStreetMap — map tiles

- Standard OSM tiles via Leaflet. No key, no account. Attribution is displayed on the map.

### Supabase — database (optional)

- Reached directly from the browser over HTTPS; there is no backend server in between.
- All calls go through `src/services/db.js`, which has one rule: **nothing in it ever
  throws.** Every function returns `{ rows, error }`, which is why a dead network cannot
  crash the console.
- Writes are **fire-and-forget**: the screen updates first, the database is told afterwards.
  So the connected chain above runs at exactly the same speed whether the database is fast,
  slow, or absent. If a write fails, the change stays on screen and an amber strip says
  plainly that it was not saved.

---

## 11. Demo workflow

The five-minute walkthrough this prototype was built to support:

1. **Sign in** — pick *Expedition Commander*. Point out that the role decides which
   controls appear.
2. **Dashboard** — one screen: 3 active expeditions, 15 personnel deployed, 5 consignments
   in transit, 5 low-stock items, 3 open incidents.
3. **Expeditions** — open *Antarctica Research Alpha* and show its status and progress.
4. **Personnel** — the 16-person roster. Show who is on that expedition and where they are.
5. **Cargo** — filter by status, then mark a consignment **DELAYED** and give a reason.
   Note the sidebar Cargo count rise as you do it.
6. **Live Map** — all 12 sites and 16 people plotted. *Say clearly that positions are
   simulated demo data, not live GPS.*
7. **Weather** — live Open-Meteo readings and the operations window for each site.
8. **Inventory** — show an item already flagged **LOW STOCK**, then step another item down
   past its minimum and watch it flag itself and the sidebar count rise.
9. **Emergency** — file an incident: pick a type, a location and an affected person.
10. **Watch the chain fire** — the alert count rises, the incident hits the dashboard
    banner, and the affected person's status flips to **EMERGENCY** on the roster and turns
    red on the map. Nobody typed those four changes.
11. **Resolve it** — acknowledge, then resolve. The counts fall and the person is released
    back to **ACTIVE**.
12. **Close the loop:** *"One centralised platform. Expedition planning, personnel, cargo,
    inventory and emergency response are not five systems that need reconciling — they are
    one system, and a change anywhere is visible everywhere."*

Step 10 is the one to slow down for. It is the whole argument.

---

## 12. Future improvements

Honest about what a production build would need next:

**Would make it real**

- **Genuine position tracking** — Iridium / Argos beacon feeds replacing the simulated
  coordinates, with position history rather than one current point.
- **Real authentication** with server-enforced permissions. The current role picker decides
  what the UI shows; it does not stop anyone. Supabase Auth plus Row Level Security policies
  tied to the signed-in user would close that gap.
- **Offline-first field devices.** A station loses connectivity routinely. Local-first
  storage with sync-on-reconnect and proper conflict resolution — right now the last write
  wins and nobody is told.
- **Real emergency dispatch** — satellite messaging or SMS on incident creation.
  Deliberately left out of the prototype rather than faked.

**Would make it better**

- **Live updates between users** via Supabase Realtime, so two people watching the console
  see each other's changes without refreshing.
- **Predictive resupply** — forecast run-out dates from consumption rates instead of only
  flagging what is already low.
- **Sea-ice and route data** from the Copernicus / NSIDC feeds, to make route planning
  physical rather than descriptive.
- **Reports and exports** — PDF expedition summaries and CSV manifests for handover.
- **Code splitting.** The bundle is one ~1 MB chunk; the map and chart libraries could load
  only on the pages that use them.
- **Automated tests.** Verification for this prototype was done by hand, module by module.

---

## Credits

Developed for the Ministry of Earth Sciences (MoES) and NCPOR. Personnel rosters
are modeled after AFMC staffing guidelines with fictionalized names for privacy.
Station names and coordinates are real Indian polar research facilities (WGS-84).
