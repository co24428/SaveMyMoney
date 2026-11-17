# SaveMyMoney

A private, single-user money log: expenses and income in Korean won, with
categories, people, places, events, receipt photos, a dashboard and a calendar.
English and Korean UI.

## Features

- **Password lock** – one password, set as the `APP_PASSWORD` environment variable. Every page and API route requires it; 5 wrong tries locks that address out for 15 minutes.
- **Add entry** – expense or income, amount, date and time, category, payment method, who you were with, where (place search + map), what for (memo + optional event such as a trip or meetup), receipt photo.
- **Dashboard** – month totals and change vs last month, spending by category, daily spending, 12-month income/expense trend, top places, people, events.
- **History** – search and filter by month, type, category, person, event.
- **Calendar** – month grid with daily totals; tap a day to see its log and a map of the places you went, numbered in time order.
- **Settings** – language, categories, people, events, log out.

## Stack

Next.js (App Router) · Postgres (Supabase free tier) · Supabase Storage for receipts ·
Leaflet + OpenStreetMap tiles · place search through Naver Local Search, falling back to OpenStreetMap.

## Setup

1. **Supabase** – create a free project at <https://supabase.com>.
   - `DATABASE_URL`: *Connect* → **Transaction pooler** URI (port 6543), with your database password filled in.
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: *Project Settings → API*.
   - No SQL to run: tables, default categories and the private `receipts` bucket are created automatically on first use.
2. **Naver place search (optional)** – at <https://developers.naver.com> register an application, enable the **Search** API, and copy the client ID and secret into `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET`. Without them, search uses OpenStreetMap.
3. **Deploy on Vercel** – import this repository at <https://vercel.com/new> and add the variables from `.env.example` under *Environment Variables*.

### Run locally

```bash
cp .env.example .env.local
```

```bash
npm install
```

```bash
npm run dev
```

Without the Supabase storage variables, local development stores receipts in `.data/receipts`.

## Notes

- Tables have row level security enabled with no policies, so they are not readable through Supabase's public API. The app connects directly as the database owner.
- Receipts are resized in the browser (longest side 1600 px) before upload and are served through short-lived signed URLs.
- Changing `APP_PASSWORD` logs out every device.
