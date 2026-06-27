# Slotly

AI-powered slot and incentive management for barbershops and salons. Customers book haircuts and get AI-recommended discounts for off-peak slots; shop owners get an AI demand forecast and a dashboard to manage incentives.

## Stack

- **Backend**: FastAPI + OpenAI (`gpt-4o`) for incentive recommendations and demand forecasting
- **Frontend**: React + TypeScript + Tailwind CSS

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

Both servers need to be running for the app to work — the frontend calls the backend at `http://127.0.0.1:8000/api`.
