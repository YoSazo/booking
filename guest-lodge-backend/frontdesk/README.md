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
| `src/tour-settings.js` | Settings walkthrough logic |
| `src/tour-apps.js` | Guest Reach / Home Screen walkthrough logic |
| `src/state.js` | Shared mutable Front Desk state |
| `src/utils.js` | Shared helpers |
| `src/styles/core.css` | Main Front Desk styles |
| `../public/frontdesk/` | Production build output served at `/frontdesk` |
| `../simple-crm.html` | Generated fallback shell from the latest build |

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
3. Commit source changes plus generated `public/frontdesk/` assets and `simple-crm.html`.

`simple-crm.html` is not editable source code anymore. It is generated from the
built `/frontdesk` app so there is one source of truth.

The old legacy importer is retired. Running this command now fails on purpose:

```bash
npm run split:legacy
```
