from fastapi import APIRouter, HTTPException
from models.schema import BookingRequest, BookingConfirmation
from routers.slots import SLOTS
import uuid

router = APIRouter()

BOOKINGS = []

@router.post("/bookings", response_model=BookingConfirmation)
def create_booking(request: BookingRequest):
    slot = next((s for s in SLOTS if s.id == request.slot_id), None)

    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.is_booked:
        raise HTTPException(status_code=409, detail="Slot already booked")

    slot.is_booked = True
    incentive_applied = slot.incentive_price is not None
    price_paid = slot.incentive_price if incentive_applied else slot.base_price

    message = (
        f"Booking confirmed for {request.customer_name}! "
        f"You saved ${round(slot.base_price - price_paid, 2)} by booking during quiet hours."
        if incentive_applied else
        f"Booking confirmed for {request.customer_name}! See you at {slot.start_time.strftime('%I:%M %p')}."
    )

    confirmation = BookingConfirmation(
        booking_id=str(uuid.uuid4()),
        slot_id=slot.id,
        customer_name=request.customer_name,
        service=request.service,
        start_time=slot.start_time,
        price_paid=price_paid,
        incentive_applied=incentive_applied,
        message=message
    )

    BOOKINGS.append(confirmation)
    return confirmation

@router.get("/bookings")
def get_bookings():
    return BOOKINGS
