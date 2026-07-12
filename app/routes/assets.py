from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import re

from app.database import get_db
from app.models.asset import Asset
from app.models.category import AssetCategory
from app.models.user import User
from app.models.allocation import AssetAllocation
from app.models.maintenance import MaintenanceRequest
from app.core.security import require_asset_manager, get_current_user
from app.schemas.asset import AssetResponse, AssetCreate, AssetUpdate, AssetTransition
from app.schemas.allocation import AllocationResponse
from app.schemas.maintenance import MaintenanceResponse
from app.services.activity_service import log_activity

router = APIRouter(
    prefix="/assets",
    tags=["Assets"]
)

@router.get("", response_model=List[AssetResponse])
def list_assets(
    tag: Optional[str] = None,
    serial: Optional[str] = None,
    qr: Optional[str] = None,
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    department_id: Optional[int] = None,
    location: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Asset)
    
    if tag:
        query = query.filter(Asset.asset_tag.ilike(f"%{tag}%"))
    if serial:
        query = query.filter(Asset.serial_number.ilike(f"%{serial}%"))
    if qr:
        query = query.filter(Asset.qr_code.ilike(f"%{qr}%"))
    if category_id:
        query = query.filter(Asset.category_id == category_id)
    if status:
        query = query.filter(Asset.status == status)
    if location:
        query = query.filter(Asset.location.ilike(f"%{location}%"))
        
    if department_id:
        # Find users belonging to the department
        user_ids = [u.id for u in db.query(User.id).filter(User.department_id == department_id).all()]
        query = query.filter(
            or_(
                # Held directly by the department
                (Asset.current_holder_type == "Department") & (Asset.current_holder_id == department_id),
                # Held by an employee of the department
                (Asset.current_holder_type == "Employee") & (Asset.current_holder_id.in_(user_ids))
            )
        )
        
    return query.all()

@router.post("", response_model=AssetResponse)
def register_asset(
    asset_data: AssetCreate,
    db: Session = Depends(get_db),
    manager_user: User = Depends(require_asset_manager)
):
    # Verify category exists
    cat = db.query(AssetCategory).filter(AssetCategory.id == asset_data.category_id).first()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category not found"
        )
        
    # Auto-generate assetTag: AF-XXXX
    tags = db.query(Asset.asset_tag).filter(Asset.asset_tag.like("AF-%")).all()
    if not tags:
        new_tag = "AF-0001"
    else:
        numbers = []
        for (t,) in tags:
            match = re.match(r"AF-(\d+)", t)
            if match:
                numbers.append(int(match.group(1)))
        next_num = max(numbers) + 1 if numbers else 1
        new_tag = f"AF-{next_num:04d}"
        
    new_asset = Asset(
        asset_tag=new_tag,
        name=asset_data.name,
        category_id=asset_data.category_id,
        serial_number=asset_data.serial_number,
        qr_code=asset_data.qr_code,
        acquisition_date=asset_data.acquisition_date,
        acquisition_cost=asset_data.acquisition_cost,
        condition=asset_data.condition,
        location=asset_data.location,
        photos_docs=asset_data.photos_docs,
        custom_values=asset_data.custom_values,
        is_bookable=asset_data.is_bookable,
        status="Available",
        current_holder_type="None",
        current_holder_id=None
    )
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    
    log_activity(db, manager_user.id, f"Registered Asset {new_asset.name} ({new_asset.asset_tag})", "Asset", new_asset.id)
    
    return new_asset

@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    return asset

@router.patch("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: int,
    update_data: AssetUpdate,
    db: Session = Depends(get_db),
    manager_user: User = Depends(require_asset_manager)
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
        
    update_dict = update_data.model_dump(exclude_unset=True)
    
    if "category_id" in update_dict:
        cat = db.query(AssetCategory).filter(AssetCategory.id == update_dict["category_id"]).first()
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found"
            )
            
    for key, value in update_dict.items():
        setattr(asset, key, value)
        
    db.commit()
    db.refresh(asset)
    
    log_activity(db, manager_user.id, f"Updated Asset {asset.name} ({asset.asset_tag})", "Asset", asset.id, update_dict)
    
    return asset

@router.get("/{asset_id}/allocation-history", response_model=List[AllocationResponse])
def get_asset_allocation_history(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(AssetAllocation).filter(AssetAllocation.asset_id == asset_id).order_by(AssetAllocation.allocated_date.desc()).all()

@router.get("/{asset_id}/maintenance-history", response_model=List[MaintenanceResponse])
def get_asset_maintenance_history(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(MaintenanceRequest).filter(MaintenanceRequest.asset_id == asset_id).order_by(MaintenanceRequest.created_at.desc()).all()

@router.post("/{asset_id}/transition", response_model=AssetResponse)
def transition_asset_status(
    asset_id: int,
    transition: AssetTransition,
    db: Session = Depends(get_db),
    manager_user: User = Depends(require_asset_manager)
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
        
    valid_statuses = ["Available", "Allocated", "Reserved", "Under Maintenance", "Lost", "Retired", "Disposed"]
    if transition.next_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of {valid_statuses}"
        )
        
    old_status = asset.status
    asset.status = transition.next_status
    
    # If transitioning to available, clear holder
    if transition.next_status == "Available":
        asset.current_holder_type = "None"
        asset.current_holder_id = None
        
    db.commit()
    db.refresh(asset)
    
    log_activity(
        db, 
        manager_user.id, 
        f"Transitioned Asset status of {asset.name} ({asset.asset_tag}) from {old_status} to {asset.status}", 
        "Asset", 
        asset.id, 
        {"old_status": old_status, "new_status": asset.status}
    )
    
    return asset
