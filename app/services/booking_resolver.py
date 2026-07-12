from sqlalchemy.orm import Session
from datetime import datetime
from app.models.asset import Asset
from app.models.booking import Booking

def update_past_bookings(db: Session):
    now = datetime.utcnow()
    # Mark expired bookings as Completed
    expired_bookings = db.query(Booking).filter(
        Booking.status.in_(["Upcoming", "Ongoing"]),
        Booking.end_time < now
    ).all()
    
    for b in expired_bookings:
        b.status = "Completed"
        
    if expired_bookings:
        db.commit()

def resolve_asset_booking_state(asset: Asset, db: Session) -> Asset:
    if not asset.is_bookable:
        return asset

    # Sync past bookings first
    update_past_bookings(db)
    
    now = datetime.utcnow()
    # Check if there is a currently active booking
    active_booking = db.query(Booking).filter(
        Booking.resource_id == asset.id,
        Booking.status.in_(["Upcoming", "Ongoing"]),
        Booking.start_time <= now,
        Booking.end_time >= now
    ).first()
    
    if active_booking:
        # Dynamic override for active booking window
        asset.status = "Reserved"
        asset.current_holder_type = "Employee"
        asset.current_holder_id = active_booking.booked_by
    else:
        # If no active booking, and it was status Reserved or had holder, clear it
        if asset.status == "Reserved" or asset.current_holder_type == "Employee":
            asset.status = "Available"
            asset.current_holder_type = "None"
            asset.current_holder_id = None
            db.commit()  # Persist the change
            
    return asset
