from fastapi import APIRouter, HTTPException
from datetime import datetime
from models.schema import (
    BookingRequest, BookingConfirmation, MetricsInsightsResponse, MetricInsight,
    RevenueBreakdown, RevenuePoint, OffpeakDeal, HistoricalDay, WeeklyStrategyResponse,
)
from routers.slots import SLOTS, BOOKED_KEYS, BASE_DATE, get_client
import json
import uuid

router = APIRouter()

BOOKINGS = []

# Synthetic "last Saturday" baseline so the AI has something concrete to compare against
LAST_WEEK_BASELINE = {"bookings_filled_pct": 58.0, "revenue": 165.0, "offpeak_deals": 2}

# Seeded 7-day history (the week leading up to BASE_DATE) for the prototype's Data tab
HISTORICAL_DATA = [
    HistoricalDay(date="2026-06-20", total_bookings=9, revenue=245.50, offpeak_deals=3, avg_rating=4.7),
    HistoricalDay(date="2026-06-21", total_bookings=6, revenue=168.00, offpeak_deals=2, avg_rating=4.6),
    HistoricalDay(date="2026-06-22", total_bookings=4, revenue=102.00, offpeak_deals=1, avg_rating=4.5),
    HistoricalDay(date="2026-06-23", total_bookings=5, revenue=128.50, offpeak_deals=2, avg_rating=4.8),
    HistoricalDay(date="2026-06-24", total_bookings=7, revenue=189.00, offpeak_deals=3, avg_rating=4.6),
    HistoricalDay(date="2026-06-25", total_bookings=8, revenue=210.00, offpeak_deals=2, avg_rating=4.9),
    HistoricalDay(date="2026-06-26", total_bookings=10, revenue=268.00, offpeak_deals=4, avg_rating=4.7),
]

@router.post("/bookings", response_model=BookingConfirmation)
def create_booking(request: BookingRequest):
    slot = next((s for s in SLOTS if s.id == request.slot_id), None)

    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    booking_date = request.date or BASE_DATE
    key = (booking_date, slot.id)
    if key in BOOKED_KEYS:
        raise HTTPException(status_code=409, detail="Slot already booked")

    BOOKED_KEYS.add(key)
    incentive_applied = slot.incentive_price is not None
    price_paid = slot.incentive_price if incentive_applied else slot.base_price

    try:
        target = datetime.strptime(booking_date, "%Y-%m-%d")
        start_time = slot.start_time.replace(year=target.year, month=target.month, day=target.day)
    except ValueError:
        start_time = slot.start_time

    message = (
        f"Booking confirmed for {request.customer_name}! "
        f"You saved ${round(slot.base_price - price_paid, 2)} by booking during quiet hours."
        if incentive_applied else
        f"Booking confirmed for {request.customer_name}! See you at {start_time.strftime('%I:%M %p')}."
    )

    confirmation = BookingConfirmation(
        booking_id=str(uuid.uuid4()),
        slot_id=slot.id,
        customer_name=request.customer_name,
        service=request.service,
        start_time=start_time,
        price_paid=price_paid,
        incentive_applied=incentive_applied,
        message=message,
        customer_phone=request.customer_phone,
        customer_email=request.customer_email,
        payment_method=request.payment_method,
    )

    BOOKINGS.append(confirmation)
    return confirmation

@router.get("/bookings")
def get_bookings():
    return BOOKINGS

def _is_today(b: BookingConfirmation) -> bool:
    return b.start_time.strftime("%Y-%m-%d") == BASE_DATE

@router.get("/bookings/metrics-insights", response_model=MetricsInsightsResponse)
async def get_metrics_insights():
    todays_bookings = [b for b in BOOKINGS if _is_today(b)]
    booked_today = sum(1 for key in BOOKED_KEYS if key[0] == BASE_DATE)
    bookings_filled_pct = round((booked_today / len(SLOTS)) * 100, 1)
    revenue_today = round(sum(b.price_paid for b in todays_bookings), 2)
    offpeak_deals = sum(1 for b in todays_bookings if b.incentive_applied)

    prompt = f"""
    You are a trusted business advisor for a barbershop owner using a booking platform.

    Today's metrics vs last Saturday:
    - Bookings filled: {bookings_filled_pct}% today vs {LAST_WEEK_BASELINE['bookings_filled_pct']}% last Saturday
    - Revenue: ${revenue_today} today vs ${LAST_WEEK_BASELINE['revenue']} last Saturday
    - Off-peak deals used: {offpeak_deals} today vs {LAST_WEEK_BASELINE['offpeak_deals']} last Saturday
    - {offpeak_deals} of today's bookings used the 20% off-peak discount on quiet morning/afternoon hours

    For each of the three metrics (Bookings filled, Revenue, Off-peak deals), respond with the
    percentage change vs last Saturday and a one-sentence plain-English explanation of what
    likely drove that change. Sound like a trusted advisor, not a chatbot. No corporate speak.

    Respond only in JSON with key "metrics": a list of exactly 3 objects, each with keys
    metric_name (string, one of "Bookings filled", "Revenue", "Off-peak deals"),
    change_pct (number), explanation (one sentence, plain english).
    """

    try:
        response = get_client().chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}]
        )
        result = json.loads(response.choices[0].message.content)
        metrics = [MetricInsight(**m) for m in result["metrics"]]
        return MetricsInsightsResponse(available=True, metrics=metrics)
    except Exception:
        return MetricsInsightsResponse(
            available=False,
            metrics=[
                MetricInsight(metric_name="Bookings filled", change_pct=round(bookings_filled_pct - LAST_WEEK_BASELINE["bookings_filled_pct"], 1), explanation="Insights are unavailable right now — showing raw numbers only."),
                MetricInsight(metric_name="Revenue", change_pct=round(revenue_today - LAST_WEEK_BASELINE["revenue"], 1), explanation="Insights are unavailable right now — showing raw numbers only."),
                MetricInsight(metric_name="Off-peak deals", change_pct=round(offpeak_deals - LAST_WEEK_BASELINE["offpeak_deals"], 1), explanation="Insights are unavailable right now — showing raw numbers only."),
            ],
        )

@router.get("/bookings/revenue-breakdown", response_model=RevenueBreakdown)
def get_revenue_breakdown():
    todays_bookings = [b for b in BOOKINGS if _is_today(b)]
    today_total = round(sum(b.price_paid for b in todays_bookings), 2)

    by_hour: dict[str, float] = {}
    for h in range(9, 21):
        by_hour[f"{h:02d}:00"] = 0.0
    for b in todays_bookings:
        key = b.start_time.strftime("%H:00")
        by_hour[key] = by_hour.get(key, 0.0) + b.price_paid
    today_by_hour = [RevenuePoint(label=k, revenue=round(v, 2)) for k, v in by_hour.items()]

    month_total = round(today_total * 30, 2)
    month_by_week = [RevenuePoint(label=f"Week {i + 1}", revenue=round(today_total * 7, 2)) for i in range(4)]

    year_total = round(today_total * 365, 2)
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    year_by_month = [RevenuePoint(label=m, revenue=round(today_total * 30, 2)) for m in months]

    return RevenueBreakdown(
        today_total=today_total,
        today_by_hour=today_by_hour,
        month_total=month_total,
        month_by_week=month_by_week,
        year_total=year_total,
        year_by_month=year_by_month,
    )

@router.get("/bookings/offpeak-today", response_model=list[OffpeakDeal])
def get_offpeak_today():
    todays_bookings = sorted([b for b in BOOKINGS if _is_today(b)], key=lambda b: b.start_time)
    deals = []
    for i, b in enumerate(todays_bookings):
        if not b.incentive_applied:
            continue
        name = b.customer_name.strip().lower()
        if not name or name == "guest":
            segment = "Unknown"
        else:
            seen_before = any(other.customer_name.strip().lower() == name for other in todays_bookings[:i])
            segment = "Returning customer" if seen_before else "New customer"
        deals.append(OffpeakDeal(
            deal_name="20% off quiet hours",
            time_slot=b.start_time.strftime("%I:%M %p"),
            customer_segment=segment,
        ))
    return deals

@router.get("/bookings/today", response_model=list[BookingConfirmation])
def get_todays_bookings():
    return sorted([b for b in BOOKINGS if _is_today(b)], key=lambda b: b.start_time)

@router.get("/bookings/historical", response_model=list[HistoricalDay])
def get_historical_data():
    return HISTORICAL_DATA

@router.get("/bookings/weekly-strategy", response_model=WeeklyStrategyResponse)
async def get_weekly_strategy():
    history_lines = "\n".join(
        f"- {d.date}: {d.total_bookings} bookings, ${d.revenue} revenue, {d.offpeak_deals} off-peak deals used, {d.avg_rating} avg rating"
        for d in HISTORICAL_DATA
    )

    prompt = f"""
    You are a strategic advisor for a barbershop owner. Here is the last 7 days of bookings data:

    {history_lines}

    Give a weekly strategic recommendation: which day to push deals on, which service to promote,
    and whether to extend opening hours on a specific day — pick whichever of these are actually
    supported by the data, up to 3 points total.

    Respond only in JSON with key "recommendations": a list of at most 3 short strings.
    Each string must be a direct, plain-English statement. Do not start any point with
    "I recommend", "Based on the data", or similar filler — just state the action.
    """

    try:
        response = get_client().chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}]
        )
        result = json.loads(response.choices[0].message.content)
        return WeeklyStrategyResponse(available=True, recommendations=result["recommendations"][:3])
    except Exception:
        return WeeklyStrategyResponse(
            available=False,
            recommendations=["Strategic recommendations are unavailable right now — check back later."],
        )
