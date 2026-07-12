from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import List, Optional

from app.database import get_db
from app.models.allocation import AssetAllocation
from app.models.asset import Asset
from app.models.user import User
from app.models.department import Department
from app.core.security import require_asset_manager, get_current_user
from app.schemas.allocation import AllocationResponse, AllocationCreate, AllocationReturn
from app.services.activity_service import log_activity, create_notification

router = APIRouter(
    prefix="/allocations",
    tags=["Allocations"]
)

@router.get("", response_model=List[AllocationResponse])
def list_allocations(
    employee_id: Optional[int] = None,
    department_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AssetAllocation)
    if employee_id is not None:
        query = query.filter(AssetAllocation.holder_type == "Employee", AssetAllocation.holder_id == employee_id)
    if department_id is not None:
        query = query.filter(AssetAllocation.holder_type == "Department", AssetAllocation.holder_id == department_id)
    if status_filter is not None:
        query = query.filter(AssetAllocation.status == status_filter)
    return query.all()

@router.get("/overdue", response_model=List[AllocationResponse])
def list_overdue_allocations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    # Find active allocations where expected return date has passed
    overdue = db.query(AssetAllocation).filter(
        AssetAllocation.status == "Active",
        AssetAllocation.expected_return_date < today,
        AssetAllocation.actual_return_date == None
    ).all()
    
    # We can also dynamically update their status to "Overdue" in DB
    for alloc in overdue:
        alloc.status = "Overdue"
    if overdue:
        db.commit()
        
    return overdue

@router.post("", response_model=AllocationResponse)
def allocate_asset(
    alloc_data: AllocationCreate,
    db: Session = Depends(get_db),
    manager_user: User = Depends(require_asset_manager)
):
    # Retrieve asset
    asset = db.query(Asset).filter(Asset.id == alloc_data.asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
        
    # Check allocation conflict
    if asset.status != "Available" or asset.current_holder_id is not None:
        # Determine current holder name
        holder_name = "Unknown"
        if asset.current_holder_type == "Employee":
            holder = db.query(User).filter(User.id == asset.current_holder_id).first()
            if holder:
                holder_name = holder.name
        elif asset.current_holder_type == "Department":
            holder = db.query(Department).filter(Department.id == asset.current_holder_id).first()
            if holder:
                holder_name = holder.name
                
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Asset is already allocated",
                "holder_type": asset.current_holder_type,
                "holder_id": asset.current_holder_id,
                "holder_name": holder_name,
                "asset_tag": asset.asset_tag
            }
        )
        
    # Verify the holder target exists
    if alloc_data.holder_type == "Employee":
        target = db.query(User).filter(User.id == alloc_data.holder_id).first()
        if not target:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target Employee not found"
            )
        holder_label = f"Employee {target.name}"
    elif alloc_data.holder_type == "Department":
        target = db.query(Department).filter(Department.id == alloc_data.holder_id).first()
        if not target:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target Department not found"
            )
        holder_label = f"Department {target.name}"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid holder type. Must be Employee or Department"
        )
        
    # Perform Allocation
    new_alloc = AssetAllocation(
        asset_id=alloc_data.asset_id,
        holder_type=alloc_data.holder_type,
        holder_id=alloc_data.holder_id,
        allocated_date=date.today(),
        expected_return_date=alloc_data.expected_return_date,
        status="Active",
        created_by=manager_user.id
    )
    
    # Update Asset status
    asset.status = "Allocated"
    asset.current_holder_type = alloc_data.holder_type
    asset.current_holder_id = alloc_data.holder_id
    
    db.add(new_alloc)
    db.commit()
    db.refresh(new_alloc)
    
    # Log and Notify
    log_activity(
        db, 
        manager_user.id, 
        f"Allocated Asset {asset.name} ({asset.asset_tag}) to {holder_label}", 
        "AssetAllocation", 
        new_alloc.id
    )
    
    if alloc_data.holder_type == "Employee":
        create_notification(
            db, 
            alloc_data.holder_id, 
            "AssetAssigned", 
            f"Asset {asset.name} ({asset.asset_tag}) has been allocated to you. Expected return: {alloc_data.expected_return_date}", 
            "AssetAllocation", 
            new_alloc.id
        )
    elif alloc_data.holder_type == "Department" and target.department_head_id:
        create_notification(
            db, 
            target.department_head_id, 
            "AssetAssigned", 
            f"Asset {asset.name} ({asset.asset_tag}) has been allocated to your department ({target.name}).", 
            "AssetAllocation", 
            new_alloc.id
        )
        
    return new_alloc

@router.get("/{allocation_id}", response_model=AllocationResponse)
def get_allocation(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alloc = db.query(AssetAllocation).filter(AssetAllocation.id == allocation_id).first()
    if not alloc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Allocation record not found"
        )
    return alloc

@router.post("/{allocation_id}/return", response_model=AllocationResponse)
def return_asset(
    allocation_id: int,
    return_data: AllocationReturn,
    db: Session = Depends(get_db),
    manager_user: User = Depends(require_asset_manager)
):
    alloc = db.query(AssetAllocation).filter(AssetAllocation.id == allocation_id).first()
    if not alloc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Allocation record not found"
        )
        
    if alloc.status == "Returned":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset has already been returned"
        )
        
    # Update allocation
    alloc.actual_return_date = date.today()
    alloc.condition_check_in_notes = return_data.condition_check_in_notes
    alloc.status = "Returned"
    
    # Revert Asset status
    asset = db.query(Asset).filter(Asset.id == alloc.asset_id).first()
    if asset:
        asset.status = "Available"
        asset.current_holder_type = "None"
        asset.current_holder_id = None
        
    db.commit()
    db.refresh(alloc)
    
    log_activity(
        db, 
        manager_user.id, 
        f"Returned Asset {asset.name if asset else 'Unknown'} (Alloc ID: {alloc.id})", 
        "AssetAllocation", 
        alloc.id, 
        {"notes": return_data.condition_check_in_notes}
    )
    
    return alloc
