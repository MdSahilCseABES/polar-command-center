# legacy/ — Version 1 prototype (ARCHIVED)

This folder holds the **original** version of the prototype: an Express server with a
vanilla-JavaScript frontend. **Nothing here was deleted** — it is kept exactly as it was.

It has been **superseded** by the React + Vite app in the parent folder.

## Why it was replaced

The v1 frontend built its HTML by joining text strings together
(see `public/app.js`). That works fine for tables, but the final prototype needed a
Leaflet map, charts, and filters that all update together — which is what React is for.

## What was carried forward into the new app

- The dark "command console" visual design (colors, fonts, badges, card styling)
- The demo data in `data/store.js`
- The incident → dashboard alert workflow logic from `server.js`

## Running this old version (OPTIONAL — you do not need to)

It is completely self-contained. From the project root:

```bash
cd legacy
npm install
npm start
```

Then open <http://localhost:3000>.

To go back to the new React app:

```bash
cd ..
npm run dev
```

## Files

| File | What it was |
|---|---|
| `server.js` | Express REST API + static file serving |
| `data/store.js` | Demo data held in memory (reset on every restart) |
| `public/index.html` | Page shell and sidebar |
| `public/app.js` | All frontend logic |
| `public/styles.css` | The original design system |
