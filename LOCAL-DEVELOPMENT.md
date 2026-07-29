# Run Marketel locally

From the repository root:

```bash
npm run dev:local
```

This builds Front Desk and starts:

- Funnel and backend: `http://localhost:3001/landing`
- Front Desk: `http://localhost:3001/frontdesk`
- Guest booking frontend: `http://localhost:5173`

To print direct links for an existing property:

```bash
npm run dev:local -- hotel-xxxxxxxx
```

Then open:

```text
http://localhost:5173/?hotelId=hotel-xxxxxxxx
http://localhost:3001/frontdesk?hotelId=hotel-xxxxxxxx
```

The complete local funnel works from the landing page. A property created during
setup is opened in Front Desk on port 3001, while its personalized guest preview
is loaded from the booking frontend on port 5173 with the new property ID.

The local launcher deliberately disables:

- Meta Pixel, Conversions API, and funnel analytics
- outbound email
- scheduled push notifications and Front Desk Assistant sweeps
- Vercel domain provisioning
- live Stripe checkout

Database-backed setup and editing remain enabled so the same property can be
loaded in both local applications. The local data source is the `DATABASE_URL`
configured in `guest-lodge-backend/.env`.

Press `Ctrl+C` once to stop both services.
