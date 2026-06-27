import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import slots, bookings

load_dotenv()

app = FastAPI(
    title="Slotly API",
    description="AI-powered slot and incentive management for barbershops and salons",
    version="0.1.0"
)

allowed_origins = os.getenv("ALLOWED_ORIGIN", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(slots.router, prefix="/api", tags=["Slots"])
app.include_router(bookings.router, prefix="/api", tags=["Bookings"])

@app.get("/")
def root():
    return {"status": "Slotly is live", "version": "0.1.0"}
