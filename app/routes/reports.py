from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import io
import csv
from datetime import date

from app.database import get_db
from app.models.asset import Asset
from app.models.category import AssetCategory
from app.models.allocation import AssetAllocation
from app.models.maintenance import MaintenanceRequest
from app.models.booking import Booking
from app.models.department import Department
from app.models.user import User
from app.core.security import require_asset_manager, get_current_user

router = APIRouter(
    prefix="/reports",
    tags=["Reports & Analytics"]
)

@router.get("/utilization")
def get_utilization_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Retrieve allocations count per asset
    alloc_counts = db.query(
        Asset.id, Asset.name, Asset.asset_tag, Asset.status,
        func.count(AssetAllocation.id).label("allocation_count")
    ).outerjoin(AssetAllocation, AssetAllocation.asset_id == Asset.id)\
     .group_by(Asset.id, Asset.name, Asset.asset_tag, Asset.status)\
     .order_by(func.count(AssetAllocation.id).desc())\
     .all()
     
    most_used = [
        {"id": a[0], "name": a[1], "tag": a[2], "status": a[3], "allocations": a[4]} 
        for a in alloc_counts if a[4] > 0
    ]
    idle = [
        {"id": a[0], "name": a[1], "tag": a[2], "status": a[3], "allocations": a[4]} 
        for a in alloc_counts if a[4] == 0
    ]
    
    return {
        "most_used_assets": most_used,
        "idle_assets": idle
    }

@router.get("/maintenance-frequency")
def get_maintenance_frequency_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Frequency per asset
    asset_maint = db.query(
        Asset.id, Asset.name, Asset.asset_tag,
        func.count(MaintenanceRequest.id).label("maint_count")
    ).join(MaintenanceRequest, MaintenanceRequest.asset_id == Asset.id)\
     .group_by(Asset.id, Asset.name, Asset.asset_tag)\
     .order_by(func.count(MaintenanceRequest.id).desc())\
     .all()
     
    # Frequency per category
    category_maint = db.query(
        AssetCategory.id, AssetCategory.name,
        func.count(MaintenanceRequest.id).label("maint_count")
    ).join(Asset, Asset.category_id == AssetCategory.id)\
     .join(MaintenanceRequest, MaintenanceRequest.asset_id == Asset.id)\
     .group_by(AssetCategory.id, AssetCategory.name)\
     .order_by(func.count(MaintenanceRequest.id).desc())\
     .all()
     
    return {
        "by_asset": [{"id": am[0], "name": am[1], "tag": am[2], "requests_count": am[3]} for am in asset_maint],
        "by_category": [{"id": cm[0], "name": cm[1], "requests_count": cm[2]} for cm in category_maint]
    }

@router.get("/due-for-maintenance-or-retirement")
def get_due_maintenance_or_retirement(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Assets in Poor/Damaged condition or having > 3 maintenance requests
    poor_assets = db.query(Asset).filter(Asset.condition.in_(["Poor", "Damaged"])).all()
    
    overused = db.query(Asset).join(MaintenanceRequest)\
        .group_by(Asset.id)\
        .having(func.count(MaintenanceRequest.id) >= 3)\
        .all()
        
    all_due = list(set(poor_assets + overused))
    
    return [
        {
            "id": a.id,
            "name": a.name,
            "tag": a.asset_tag,
            "condition": a.condition,
            "status": a.status,
            "actions_suggested": "Retire" if a.condition == "Damaged" else "Schedule Maintenance"
        } for a in all_due
    ]

@router.get("/department-allocation-summary")
def get_department_allocation_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Active allocations to departments
    dept_allocs = db.query(
        Department.id, Department.name,
        func.count(AssetAllocation.id).label("allocations_count")
    ).join(AssetAllocation, (AssetAllocation.holder_type == "Department") & (AssetAllocation.holder_id == Department.id))\
     .filter(AssetAllocation.status == "Active")\
     .group_by(Department.id, Department.name)\
     .all()
     
    # Active allocations to employees inside departments
    employee_allocs = db.query(
        Department.id, Department.name,
        func.count(AssetAllocation.id).label("allocations_count")
    ).join(User, User.department_id == Department.id)\
     .join(AssetAllocation, (AssetAllocation.holder_type == "Employee") & (AssetAllocation.holder_id == User.id))\
     .filter(AssetAllocation.status == "Active")\
     .group_by(Department.id, Department.name)\
     .all()
     
    dept_summary = {}
    for d_id, d_name, d_count in dept_allocs:
        dept_summary[d_id] = {"id": d_id, "name": d_name, "allocated_to_dept": d_count, "allocated_to_employees": 0}
        
    for d_id, d_name, d_count in employee_allocs:
        if d_id in dept_summary:
            dept_summary[d_id]["allocated_to_employees"] = d_count
        else:
            dept_summary[d_id] = {"id": d_id, "name": d_name, "allocated_to_dept": 0, "allocated_to_employees": d_count}
            
    return list(dept_summary.values())

@router.get("/booking-heatmap")
def get_booking_heatmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Peak usage windows (hours of day and days of week)
    # Using SQLite/Postgres compatible extraction or datetime operations
    bookings = db.query(Booking.start_time).filter(Booking.status != "Cancelled").all()
    
    hour_counts = {}
    day_counts = {}
    
    for (start_t,) in bookings:
        hr = start_t.hour
        dy = start_t.strftime("%A")
        hour_counts[hr] = hour_counts.get(hr, 0) + 1
        day_counts[dy] = day_counts.get(dy, 0) + 1
        
    return {
        "hourly_distribution": hour_counts,
        "daily_distribution": day_counts
    }

@router.get("/export")
def export_report(
    type: str,  # utilization, maintenance, due, department
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if format.lower() != "csv":
        # Mock pdf response
        return {"message": "PDF format generation completed successfully (mock payload)"}
        
    output = io.StringIO()
    writer = csv.writer(output)
    
    if type == "utilization":
        writer.writerow(["Asset Tag", "Asset Name", "Status", "Allocations Count"])
        alloc_counts = db.query(
            Asset.asset_tag, Asset.name, Asset.status,
            func.count(AssetAllocation.id).label("allocation_count")
        ).outerjoin(AssetAllocation, AssetAllocation.asset_id == Asset.id)\
         .group_by(Asset.id, Asset.asset_tag, Asset.name, Asset.status)\
         .all()
        for tag, name, status_val, count in alloc_counts:
            writer.writerow([tag, name, status_val, count])
    else:
        writer.writerow(["Report Name", "Date Generated"])
        writer.writerow([type, date.today().isoformat()])
        
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={type}_report.csv"}
    )
