# Front Desk (modular build)

Front Desk is split from `simple-crm.html` into lazy-loaded Vite modules for faster cold start.

## Structure

| File | Purpose |
|------|---------|
| `simple-crm.html` (repo root) | **Edit this** — source of truth for Front Desk logic |
| `scripts/split-crm.mjs` | Splits the monolith into `src/` modules |
| `src/core.js` | Boot, login, bookings, availability, revenue (~78 KB) |
| `src/settings.js` | Settings + room editor (loaded on login, default tab) |
| `src/apps.js` | Apps tab + tours (**lazy**, ~31 KB) |
| `public/frontdesk/` | Production build output (served at `/frontdesk`) |

## Commands

```bash
# From guest-lodge-backend/
npm run build:frontdesk

# Or from this folder
npm run build
```

## Workflow

1. Edit `simple-crm.html` as usual
2. Run `npm run build:frontdesk`
3. Deploy backend (built assets in `public/frontdesk/` are committed)

`src/` is regenerated on each build — do not edit by hand.

## Performance

- **Before:** ~403 KB monolithic HTML, all JS parsed on load
- **After:** ~8 KB shell + ~79 KB core JS + settings chunk; Apps tab code loads only when opened
- CSS is external and cacheable via service worker (`frontdesk-sw.js` v3)

### Phase 3

- **Self-hosted fonts** — DM Sans + DM Mono via `@fontsource` (no Google Fonts round trip)
- **Slimmer bookings API** — `select` only list-card fields (~60% smaller payloads)
- **Lightweight message badges** — `GET /api/crm/messages/unread-count` on idle; full threads only on Bookings tab
- **Virtual scrolling** — lists with 25+ bookings render only visible cards
