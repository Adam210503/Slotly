from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Slot(BaseModel):
    id: str
    start_time: datetime
    end_time: datetime
    service: str
    base_price: float
    incentive_price: Optional[float] = None
    incentive_label: Optional[str] = None
    is_peak: bool
    is_booked: bool = False

class BookingRequest(BaseModel):
    slot_id: str
    customer_name: str
    customer_phone: str
    service: str

class BookingConfirmation(BaseModel):
    booking_id: str
    slot_id: str
    customer_name: str
    service: str
    start_time: datetime
    price_paid: float
    incentive_applied: bool
    message: str

class IncentiveRecommendation(BaseModel):
    slot_id: str
    recommended_discount_pct: float
    reasoning: str

class DemandForecast(BaseModel):
    hour: str
    predicted_occupancy_pct: float
    is_peak: bool
    forecast_label: str  # e.g. "Likely full", "Quiet period"

class DemandForecastReport(BaseModel):
    shop_name: str
    date: str
    overall_summary: str       # LLM-generated plain english summary
    peak_warning: str          # LLM-generated advice for the owner
    suggested_action: str      # LLM-generated recommended action
    hourly_forecast: list[DemandForecast]