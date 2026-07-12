from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from app.database import get_db
from app.models.booking import Booking
from app.models.asset import Asset
from app.models.user import User
from app.core.security import get_current_user
from app.schemas.booking import BookingResponse, BookingCreate, BookingReschedule
from app.services.activity_service import log_activity, create_notification

router = APIRouter(
    tags=["Bookings"]
)

@router.get("/assets/{asset_id}/bookings", response_model=List[BookingResponse])
def get_asset_bookings(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    return db.query(Booking).filter(Booking.resource_id == asset_id).order_by(Booking.start_time.asc()).all()

@router.get("/bookings", response_model=List[BookingResponse])
def list_bookings(
    user_id: Optional[int] = None,
    resource_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Booking)
    if user_id is not None:
        query = query.filter(Booking.booked_by == user_id)
    if resource_id is not None:
        query = query.filter(Booking.resource_id == resource_id)
    if status_filter is not None:
        query = query.filter(Booking.status == status_filter)
    if start_date is not None:
        query = query.filter(Booking.start_time >= start_date)
    if end_date is not None:
        query = query.filter(Booking.end_time <= end_date)
        
    return query.order_by(Booking.start_time.asc()).all()

@router.get("/bookings/upcoming", response_model=List[BookingResponse])
def list_upcoming_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.utcnow()
    return db.query(Booking).filter(
        Booking.status == "Upcoming",
        Booking.start_time > now
    ).order_by(Booking.start_time.asc()).all()

@router.post("/bookings", response_model=BookingResponse)
def create_booking(
    booking_data: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == booking_data.resource_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource asset not found"
        )
        
    # Verify asset is bookable
    if not asset.is_bookable:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset is not flagged as bookable"
        )
        
    # Check booking status / retired, etc.
    if asset.status in ["Retired", "Disposed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset cannot be booked because it is {asset.status}"
        )
        
    # Overlap validation: startTime < existing.endTime AND endTime > existing.startTime
    # Exclude Cancelled bookings
    overlap = db.query(Booking).filter(
        Booking.resource_id == booking_data.resource_id,
        Booking.status != "Cancelled",
        Booking.start_time < booking_data.end_time,
        Booking.end_time > booking_data.start_time
    ).first()
    
    if overlap:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Resource booking overlap conflict detected"
        )
        
    new_booking = Booking(
        resource_id=booking_data.resource_id,
        booked_by=current_user.id,
        start_time=booking_data.start_time,
        end_time=booking_data.end_time,
        purpose=booking_data.purpose,
        status="Upcoming"
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    
    log_activity(
        db, 
        current_user.id, 
        f"Booked Resource {asset.name} from {new_booking.start_time} to {new_booking.end_time}", 
        "Booking", 
        new_booking.id
    )
    
    create_notification(
        db,
        current_user.id,
        "BookingConfirmed",
        f"Your booking for {asset.name} has been confirmed.",
        "Booking",
        new_booking.id
    )
    
    return new_booking

@router.get("/bookings/{booking_id}", response_model=BookingResponse)
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    return booking

@router.patch("/bookings/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
        
    if booking.status in ["Completed", "Cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Booking is already in {booking.status} status"
        )
        
    booking.status = "Cancelled"
    db.commit()
    db.refresh(booking)
    
    # Notify user
    asset = db.query(Asset).filter(Asset.id == booking.resource_id).first()
    create_notification(
        db,
        booking.booked_by,
        "BookingCancelled",
        f"Your booking for {asset.name if asset else 'Unknown'} has been cancelled.",
        "Booking",
        booking.id
    )
    
    log_activity(db, current_user.id, f"Cancelled Booking ID {booking.id}", "Booking", booking.id)
    
    return booking

@router.patch("/bookings/{booking_id}/reschedule", response_model=BookingResponse)
def reschedule_booking(
    booking_id: int,
    reschedule_data: BookingReschedule,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
        
    if booking.status in ["Completed", "Cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Booking is in {booking.status} status and cannot be rescheduled"
        )
        
    # Check overlap, excluding this current booking
    overlap = db.query(Booking).filter(
        Booking.resource_id == booking.resource_id,
        Booking.id != booking_id,
        Booking.status != "Cancelled",
        Booking.start_time < reschedule_data.end_time,
        Booking.end_time > reschedule_data.start_time
    ).first()
    
    if overlap:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Resource booking overlap conflict detected"
        )
        
    old_start = booking.start_time
    old_end = booking.end_time
    
    booking.start_time = reschedule_data.start_time
    booking.end_time = reschedule_data.end_time
    booking.status = "Upcoming"
    
    db.commit()
    db.refresh(booking)
    
    log_activity(
        db, 
        current_user.id, 
        f"Rescheduled Booking ID {booking.id} from {old_start}-{old_end} to {booking.start_time}-{booking.end_time}", 
        "Booking", 
        booking.id
    )
    
    return booking
