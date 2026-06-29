from fastapi import APIRouter
from datetime import datetime, timedelta
from models.schema import Slot, IncentiveRecommendation, DemandForecast, DemandForecastReport, DashboardExplainRequest, DashboardExplainResponse
from openai import OpenAI
import os, json, uuid

router = APIRouter()
client = None

def get_client():
    global client
    if client is None:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return client

def generate_slots():
    slots = []
    base = datetime(2026, 6, 27, 9, 0)

    schedule = [
        ("09:00", False, 30.0),
        ("10:00", False, 30.0),
        ("11:00", False, 30.0),
        ("12:00", True,  30.0),
        ("13:00", True,  30.0),
        ("14:00", False, 30.0),
        ("15:00", False, 30.0),
        ("16:00", False, 30.0),
        ("17:00", True,  30.0),
        ("18:00", True,  30.0),
        ("19:00", True,  30.0),
        ("20:00", True,  30.0),
    ]

    for time_str, is_peak, base_price in schedule:
        hour, minute = map(int, time_str.split(":"))
        start = base.replace(hour=hour, minute=minute)
        end = start + timedelta(minutes=45)

        incentive_price = None
        incentive_label = None

        if not is_peak:
            incentive_price = round(base_price * 0.8, 2)
            incentive_label = "20% off — walk-in friendly hours"

        slots.append(Slot(
            id=str(uuid.uuid4()),
            start_time=start,
            end_time=end,
            service="Haircut",
            base_price=base_price,
            incentive_price=incentive_price,
            incentive_label=incentive_label,
            is_peak=is_peak,
            is_booked=False
        ))

    return slots

SLOTS = generate_slots()
BASE_DATE = "2026-06-27"

# Booked state is tracked per (date, slot_id) pair, not on the shared slot
# template — otherwise booking a slot on one date would mark it booked on
# every date forever.
BOOKED_KEYS: set[tuple[str, str]] = {(BASE_DATE, SLOTS[i].id) for i in [3, 4, 9, 10]}

# Synthetic demand pattern — mimics real barbershop foot traffic data
DEMAND_PATTERN = {
    "09:00": 15, "10:00": 25, "11:00": 35,
    "12:00": 80, "13:00": 85, "14:00": 40,
    "15:00": 35, "16:00": 45, "17:00": 75,
    "18:00": 95, "19:00": 90, "20:00": 70,
}

@router.get("/slots", response_model=list[Slot])
def get_slots(date: str = None):
    target_date = date or BASE_DATE
    try:
        target = datetime.strptime(target_date, "%Y-%m-%d")
    except ValueError:
        target_date = BASE_DATE
        target = datetime.strptime(BASE_DATE, "%Y-%m-%d")

    updated = []
    for slot in SLOTS:
        new_slot = slot.copy()
        new_slot.start_time = slot.start_time.replace(
            year=target.year, month=target.month, day=target.day
        )
        new_slot.end_time = slot.end_time.replace(
            year=target.year, month=target.month, day=target.day
        )
        new_slot.is_booked = (target_date, slot.id) in BOOKED_KEYS
        updated.append(new_slot)
    return updated

@router.get("/slots/available", response_model=list[Slot])
def get_available_slots():
    return [s for s in get_slots() if not s.is_booked]

@router.get("/slots/offpeak", response_model=list[Slot])
def get_offpeak_slots():
    return [s for s in get_slots() if not s.is_peak and not s.is_booked]

@router.post("/slots/{slot_id}/recommend-incentive", response_model=IncentiveRecommendation)
async def recommend_incentive(slot_id: str):
    slot = next((s for s in SLOTS if s.id == slot_id), None)
    if not slot:
        return {"error": "Slot not found"}

    booked_count = sum(1 for s in SLOTS if (BASE_DATE, s.id) in BOOKED_KEYS)
    occupancy_pct = round((booked_count / len(SLOTS)) * 100)

    prompt = f"""
    You are an AI assistant helping a barbershop owner set smart incentives for quiet slots.

    Current shop context:
    - Overall occupancy: {occupancy_pct}%
    - Slot time: {slot.start_time.strftime('%A %I:%M %p')}
    - Is peak hour: {slot.is_peak}
    - Base price: ${slot.base_price}

    Recommend a discount percentage (0-30%) for this slot to attract customers during quiet hours.
    Respond only in JSON with keys: recommended_discount_pct (float), reasoning (one sentence, plain english).
    """

    response = get_client().chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[{"role": "user", "content": prompt}]
    )

    result = json.loads(response.choices[0].message.content)

    return IncentiveRecommendation(
        slot_id=slot_id,
        recommended_discount_pct=result["recommended_discount_pct"],
        reasoning=result["reasoning"]
    )

@router.get("/slots/demand-forecast", response_model=DemandForecastReport)
async def get_demand_forecast():
    # Build hourly forecast from synthetic demand pattern
    hourly = []
    for time_str, occupancy in DEMAND_PATTERN.items():
        is_peak = occupancy >= 70
        if occupancy >= 85:
            label = "Likely full — expect a queue"
        elif occupancy >= 70:
            label = "Busy period"
        elif occupancy >= 40:
            label = "Moderate — good walk-in chance"
        else:
            label = "Quiet period — deals available"

        hourly.append(DemandForecast(
            hour=time_str,
            predicted_occupancy_pct=float(occupancy),
            is_peak=is_peak,
            forecast_label=label
        ))

    # Build context summary for LLM
    peak_hours = [h for h in hourly if h.is_peak]
    quiet_hours = [h for h in hourly if not h.is_peak]
    peak_str = ", ".join([h.hour for h in peak_hours])
    quiet_str = ", ".join([h.hour for h in quiet_hours])

    prompt = f"""
    You are an AI business advisor helping a barbershop owner understand today's demand forecast.

    Today's predicted demand:
    - Peak hours (70%+ occupancy): {peak_str}
    - Quiet hours (under 70% occupancy): {quiet_str}
    - Busiest slot: 6pm at 95% predicted occupancy
    - Quietest slot: 9am at 15% predicted occupancy

    Respond only in JSON with exactly these keys:
    - overall_summary: 2 sentence plain english summary of today's demand pattern for the owner
    - peak_warning: one sentence warning about the busiest period and what to expect
    - suggested_action: one concrete actionable suggestion to maximise revenue during quiet hours

    Be direct, practical, and speak like a trusted business advisor, not a chatbot.
    """

    response = get_client().chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[{"role": "user", "content": prompt}]
    )

    result = json.loads(response.choices[0].message.content)

    return DemandForecastReport(
        shop_name="Slotly Demo Barbershop",
        date=datetime.now().strftime("%A, %d %B %Y"),
        overall_summary=result["overall_summary"],
        peak_warning=result["peak_warning"],
        suggested_action=result["suggested_action"],
        hourly_forecast=hourly
    )

@router.post("/dashboard/explain", response_model=DashboardExplainResponse)
async def explain_metric(request: DashboardExplainRequest):
    prompt = f"""
    You are a trusted business advisor speaking directly to a barbershop owner
    about their dashboard for today.

    Metric: {request.metric}
    Current value: {request.value}
    Change: {request.change}
    Context: {request.context}

    Write a one-sentence, plain-English explanation of what's driving this
    number, using the specific context given. Be concrete and specific —
    reference the actual context provided. Do not use generic filler like
    "this is due to increased demand" or "this is likely due to various factors."

    Respond only in JSON with key "explanation" containing the one sentence.
    """

    try:
        response = get_client().chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}]
        )
        result = json.loads(response.choices[0].message.content)
        return DashboardExplainResponse(explanation=result["explanation"])
    except Exception:
        return DashboardExplainResponse(explanation=f"{request.metric} moved because of {request.context.lower()}")