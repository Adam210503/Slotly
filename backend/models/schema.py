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
    date: Optional[str] = None
    customer_email: Optional[str] = None
    payment_method: Optional[str] = None

class BookingConfirmation(BaseModel):
    booking_id: str
    slot_id: str
    customer_name: str
    service: str
    start_time: datetime
    price_paid: float
    incentive_applied: bool
    message: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    payment_method: Optional[str] = None

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

class MetricInsight(BaseModel):
    metric_name: str
    change_pct: float
    explanation: str

class MetricsInsightsResponse(BaseModel):
    available: bool
    metrics: list[MetricInsight]

class RevenuePoint(BaseModel):
    label: str
    revenue: float

class RevenueBreakdown(BaseModel):
    today_total: float
    today_by_hour: list[RevenuePoint]
    month_total: float
    month_by_week: list[RevenuePoint]
    year_total: float
    year_by_month: list[RevenuePoint]

class OffpeakDeal(BaseModel):
    deal_name: str
    time_slot: str
    customer_segment: str

class HistoricalDay(BaseModel):
    date: str
    total_bookings: int
    revenue: float
    offpeak_deals: int
    avg_rating: float

class WeeklyStrategyResponse(BaseModel):
    available: bool
    recommendations: list[str]

class DashboardExplainRequest(BaseModel):
    metric: str
    value: str
    change: str
    context: str

class DashboardExplainResponse(BaseModel):
    explanation: str