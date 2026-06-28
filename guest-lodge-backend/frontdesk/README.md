# Front Desk

Front Desk is the modular Vite source for the `/frontdesk` app. Edit files in
`frontdesk/src/`, then build the static assets served by the backend.

## Structure

| File | Purpose |
|------|---------|
| `src/main.js` | App entry, fonts, global CSS, core boot |
| `src/core.js` | Boot, login, bookings, availability, revenue |
| `src/settings.js` | Settings and room editor |
| `src/apps.js` | Phones/apps tab and tours, lazy-loaded |
| `src/state.js` | Shared mutable Front Desk state |
| `src/utils.js` | Shared helpers |
| `src/styles/core.css` | Main Front Desk styles |
| `../public/frontdesk/` | Production build output served at `/frontdesk` |
| `../simple-crm.html` | Legacy fallback only |

## Commands

```bash
# From guest-lodge-backend/
npm run build:frontdesk

# Or from this folder
npm run build
npm run dev
```

## Workflow

1. Edit `frontdesk/src/`.
2. Run `npm run build:frontdesk` from `guest-lodge-backend/`.
3. Commit both source changes and generated `public/frontdesk/` assets.

`simple-crm.html` is no longer the source of truth. The legacy importer is kept
only as an escape hatch:

```bash
npm run split:legacy
```

That command overwrites `frontdesk/src/` from `simple-crm.html`, so use it only
when intentionally re-importing the old monolith.
