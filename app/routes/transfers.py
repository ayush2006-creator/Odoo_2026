from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List

from app.database import get_db
from app.models.transfer import TransferRequest
from app.models.asset import Asset
from app.models.allocation import AssetAllocation
from app.models.user import User
from app.models.department import Department
from app.core.security import require_department_head, get_current_user
from app.schemas.transfer import TransferResponse, TransferCreate
from app.services.activity_service import log_activity, create_notification

router = APIRouter(
    prefix="/transfers",
    tags=["Transfers"]
)

@router.get("", response_model=List[TransferResponse])
def list_transfers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(TransferRequest).all()

@router.post("", response_model=TransferResponse)
def create_transfer_request(
    transfer_data: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == transfer_data.asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
        
    if asset.current_holder_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset is not currently allocated to anyone. Allocate it directly instead."
        )
        
    # Verify target holder exists
    target_user = db.query(User).filter(User.id == transfer_data.to_holder_id).first()
    target_dept = db.query(Department).filter(Department.id == transfer_data.to_holder_id).first()
    
    if not target_user and not target_dept:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target holder (Employee or Department) not found"
        )
        
    # Prevent transfer to same holder
    if asset.current_holder_id == transfer_data.to_holder_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset is already held by this target"
        )

    new_transfer = TransferRequest(
        asset_id=transfer_data.asset_id,
        from_holder_id=asset.current_holder_id,
        to_holder_id=transfer_data.to_holder_id,
        requested_by=current_user.id,
        status="Requested"
    )
    db.add(new_transfer)
    db.commit()
    db.refresh(new_transfer)
    
    log_activity(
        db, 
        current_user.id, 
        f"Requested Transfer of Asset {asset.name} ({asset.asset_tag}) to holder ID {transfer_data.to_holder_id}", 
        "TransferRequest", 
        new_transfer.id
    )
    
    # Notify Department Head or Asset Managers
    # Find department head of current holder or asset managers
    # Let's send a notification to the manager/admin
    # In a real app we'd look up. Let's notify the target holder and the previous holder.
    create_notification(
        db,
        current_user.id,
        "BookingConfirmed", # general type
        f"Your transfer request for asset {asset.name} has been submitted.",
        "TransferRequest",
        new_transfer.id
    )
    
    return new_transfer

@router.get("/{transfer_id}", response_model=TransferResponse)
def get_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transfer = db.query(TransferRequest).filter(TransferRequest.id == transfer_id).first()
    if not transfer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer request not found"
        )
    return transfer

@router.patch("/{transfer_id}/approve", response_model=TransferResponse)
def approve_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    approver: User = Depends(require_department_head)
):
    transfer = db.query(TransferRequest).filter(TransferRequest.id == transfer_id).first()
    if not transfer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer request not found"
        )
        
    if transfer.status != "Requested":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transfer request is in '{transfer.status}' status and cannot be approved"
        )
        
    asset = db.query(Asset).filter(Asset.id == transfer.asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset associated with this transfer not found"
        )
        
    # 1. Close current allocation
    current_alloc = db.query(AssetAllocation).filter(
        AssetAllocation.asset_id == asset.id,
        AssetAllocation.status == "Active"
    ).first()
    if current_alloc:
        current_alloc.actual_return_date = date.today()
        current_alloc.status = "Returned"
        current_alloc.condition_check_in_notes = f"Transferred via Request ID {transfer.id}"
        
    # 2. Determine holder type of to_holder_id
    target_user = db.query(User).filter(User.id == transfer.to_holder_id).first()
    target_dept = db.query(Department).filter(Department.id == transfer.to_holder_id).first()
    
    holder_type = "Employee" if target_user else "Department"
    holder_name = target_user.name if target_user else (target_dept.name if target_dept else "Unknown")
    
    # 3. Create new allocation
    new_alloc = AssetAllocation(
        asset_id=asset.id,
        holder_type=holder_type,
        holder_id=transfer.to_holder_id,
        allocated_date=date.today(),
        status="Active",
        created_by=approver.id
    )
    db.add(new_alloc)
    
    # 4. Update asset state
    asset.status = "Allocated"
    asset.current_holder_type = holder_type
    asset.current_holder_id = transfer.to_holder_id
    
    # 5. Resolve transfer request
    transfer.status = "Completed"
    transfer.approved_by = approver.id
    transfer.resolved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(transfer)
    
    # Logs and notifications
    log_activity(
        db, 
        approver.id, 
        f"Approved Transfer of Asset {asset.name} to {holder_name}", 
        "TransferRequest", 
        transfer.id
    )
    
    # Notify requester
    create_notification(
        db,
        transfer.requested_by,
        "TransferApproved",
        f"Your transfer request for asset {asset.name} has been approved and completed.",
        "TransferRequest",
        transfer.id
    )
    
    # Notify new holder if employee
    if holder_type == "Employee":
        create_notification(
            db,
            transfer.to_holder_id,
            "AssetAssigned",
            f"Asset {asset.name} ({asset.asset_tag}) has been transferred to you.",
            "AssetAllocation",
            new_alloc.id
        )
        
    return transfer

@router.patch("/{transfer_id}/reject", response_model=TransferResponse)
def reject_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    approver: User = Depends(require_department_head)
):
    transfer = db.query(TransferRequest).filter(TransferRequest.id == transfer_id).first()
    if not transfer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer request not found"
        )
        
    if transfer.status != "Requested":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transfer request is in '{transfer.status}' status and cannot be rejected"
        )
        
    transfer.status = "Rejected"
    transfer.approved_by = approver.id
    transfer.resolved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(transfer)
    
    # Notify requester
    asset = db.query(Asset).filter(Asset.id == transfer.asset_id).first()
    create_notification(
        db,
        transfer.requested_by,
        "MaintenanceRejected",  # using general reject type
        f"Your transfer request for asset {asset.name if asset else 'Unknown'} was rejected.",
        "TransferRequest",
        transfer.id
    )
    
    log_activity(db, approver.id, f"Rejected Transfer Request ID {transfer.id}", "TransferRequest", transfer.id)
    
    return transfer
