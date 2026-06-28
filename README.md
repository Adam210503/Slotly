# Slotly

AI-powered slot and incentive management for barbershops and salons. Customers browse 20 Singapore barbershops, book haircuts, and get AI-recommended discounts for off-peak slots; shop owners get an AI demand forecast, revenue analytics, and a dashboard to manage incentives.

**Live**: https://slotly-frontend.onrender.com (API: https://slotly-backend-sozd.onrender.com)

Both run on Render's free tier and spin down after ~15 min idle — the first request after that takes 30-60s to wake up.

## Features

**Customer**
- Browse/search 20 Singapore barbershops with ratings, distance, and a map view; sort and filter by distance, favourites, or minimum rating
- Book a slot per date, with AI-recommended off-peak discounts (booking conflicts are checked per date, not globally)
- Favourite shops, view upcoming/completed bookings sorted chronologically, leave reviews

**Business owner**
- Live dashboard: bookings filled, revenue, and off-peak deals, each with a one-sentence AI explanation of what drove the change
- Revenue breakdown (Today / Month / Year) and a predicted-vs-actual hourly demand chart, both via `recharts`
- Off-peak deals breakdown by time slot and customer segment (new vs. returning)
- Real-time bookings list with colour-coded payment status (paid online vs. pay in store), expandable for full customer details
- 7-day historical data table + revenue trend chart, plus a GPT-4o weekly strategy recommendation
- Editable business account (name, location, service, price, off-peak discount and time slot)

## Stack

- **Backend**: FastAPI + OpenAI (`gpt-4o`) for incentive recommendations, demand forecasting, and dashboard insights
- **Frontend**: React + TypeScript + Tailwind CSS + Google Maps (`@vis.gl/react-google-maps`) + `recharts` for analytics charts

## Project structure

```
backend/   FastAPI app, slot/booking routes, OpenAI integration
frontend/  React app (single-page, all screens in src/App.tsx)
```

## Setup

### Backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

Create `backend/.env`:

```
OPENAI_API_KEY=sk-...
```

Run the API:

```bash
source venv/bin/activate
cd backend
uvicorn main:app --reload
```

Serves at `http://127.0.0.1:8000`.

### Frontend

```bash
cd frontend
npm install
npm start
```

Opens at `http://localhost:3000`.

Both servers need to be running for the app to work — the frontend calls the backend at `http://127.0.0.1:8000/api` by default.

Create `frontend/.env` for the map to render:

```
REACT_APP_GOOGLE_MAPS_KEY=AIza...
```

The Google Cloud project behind that key needs the **Maps JavaScript API** enabled, a billing account linked, and a Map ID of type **JavaScript** (Cloud Console → Google Maps Platform → Map Management).

`REACT_APP_*` vars are only read when the dev server starts — restart `npm start` after creating or changing `frontend/.env`.

## Deployment

`render.yaml` defines both services as a Render Blueprint (Dashboard → New + → Blueprint → select this repo). After the first deploy, set these in each service's Environment tab:

- `slotly-backend`: `OPENAI_API_KEY` (your key), `ALLOWED_ORIGIN` (the frontend's URL)
- `slotly-frontend`: `REACT_APP_API_URL` (the backend's URL + `/api`), `REACT_APP_GOOGLE_MAPS_KEY`

`REACT_APP_*` vars are baked in at build time, so changing any of them requires a manual redeploy of `slotly-frontend` to take effect.
