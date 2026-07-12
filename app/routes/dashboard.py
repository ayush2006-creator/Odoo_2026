from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta

from app.database import get_db
from app.models.asset import Asset
from app.models.maintenance import MaintenanceRequest
from app.models.booking import Booking
from app.models.transfer import TransferRequest
from app.models.allocation import AssetAllocation
from app.models.user import User
from app.core.security import get_current_user
from app.schemas.allocation import AllocationResponse

from app.services.booking_resolver import resolve_asset_booking_state

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

@router.get("/kpis")
def get_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    now = datetime.utcnow()
    
    # Sync assets with current booking states first
    assets = db.query(Asset).all()
    for asset in assets:
        resolve_asset_booking_state(asset, db)
        
    # 1. Assets Available
    available = db.query(Asset).filter(Asset.status == "Available").count()
    
    # 2. Assets Allocated
    allocated = db.query(Asset).filter(Asset.status == "Allocated").count()
    
    # 3. Assets Under Maintenance
    under_maintenance = db.query(Asset).filter(Asset.status == "Under Maintenance").count()
    
    # 4. Assets Reserved (booked)
    reserved = db.query(Asset).filter(Asset.status == "Reserved").count()
    
    # 5. Total Assets
    total_assets = db.query(Asset).count()
    
    # 6. Maintenance Today (raised or resolved today, or active)
    start_of_today = datetime.combine(today, datetime.min.time())
    maintenance_today = db.query(MaintenanceRequest).filter(
        (MaintenanceRequest.created_at >= start_of_today) | 
        (MaintenanceRequest.status.in_(["InProgress", "TechnicianAssigned", "Approved"]))
    ).count()
    
    # 7. Active Bookings
    active_bookings = db.query(Booking).filter(
        Booking.status.in_(["Ongoing", "Upcoming"]),
        Booking.start_time <= now,
        Booking.end_time >= now
    ).count()
    
    # 8. Pending Transfers
    pending_transfers = db.query(TransferRequest).filter(TransferRequest.status == "Requested").count()
    
    # 9. Upcoming Returns (next 7 days)
    seven_days_later = today + timedelta(days=7)
    upcoming_returns = db.query(AssetAllocation).filter(
        AssetAllocation.status == "Active",
        AssetAllocation.expected_return_date >= today,
        AssetAllocation.expected_return_date <= seven_days_later
    ).count()
    
    return {
        "total_assets": total_assets,
        "assets_available": available,
        "assets_allocated": allocated,
        "assets_under_maintenance": under_maintenance,
        "assets_reserved": reserved,
        "maintenance_today": maintenance_today,
        "active_bookings": active_bookings,
        "pending_transfers": pending_transfers,
        "upcoming_returns": upcoming_returns
    }

@router.get("/overdue", response_model=list[AllocationResponse])
def get_overdue_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    # Return list of overdue allocations
    overdue = db.query(AssetAllocation).filter(
        AssetAllocation.status == "Active",
        AssetAllocation.expected_return_date < today
    ).all()
    return overdue
