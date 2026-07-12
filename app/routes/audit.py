from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from app.database import get_db
from app.models.audit import AuditCycle, AuditorAssignment, AuditItem, DiscrepancyReport
from app.models.asset import Asset
from app.models.user import User
from app.core.security import require_admin, get_current_user
from app.schemas.audit import (
    AuditCycleResponse,
    AuditCycleCreate,
    AuditorsAssign,
    AuditItemResponse,
    AuditItemUpdate,
    DiscrepancyResponse
)
from app.services.activity_service import log_activity, create_notification

router = APIRouter(
    prefix="/audit-cycles",
    tags=["Audit Cycles"]
)

@router.get("", response_model=List[AuditCycleResponse])
def list_audit_cycles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(AuditCycle).all()

@router.post("", response_model=AuditCycleResponse)
def create_audit_cycle(
    cycle_data: AuditCycleCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    # Create audit cycle
    new_cycle = AuditCycle(
        name=cycle_data.name,
        scope_type=cycle_data.scope_type,
        scope_value=cycle_data.scope_value,
        date_range_start=cycle_data.date_range_start,
        date_range_end=cycle_data.date_range_end,
        status="Open",
        created_by=admin_user.id
    )
    db.add(new_cycle)
    db.commit()
    db.refresh(new_cycle)
    
    # Auto-populate Audit Items based on scope
    assets_in_scope = []
    if cycle_data.scope_type == "Location":
        assets_in_scope = db.query(Asset).filter(Asset.location == cycle_data.scope_value).all()
    elif cycle_data.scope_type == "Department":
        try:
            dept_id = int(cycle_data.scope_value)
            # Find users belonging to this department
            user_ids = [u.id for u in db.query(User.id).filter(User.department_id == dept_id).all()]
            assets_in_scope = db.query(Asset).filter(
                (Asset.current_holder_type == "Department") & (Asset.current_holder_id == dept_id) |
                (Asset.current_holder_type == "Employee") & (Asset.current_holder_id.in_(user_ids))
            ).all()
        except ValueError:
            # Fallback if scope value is name
            dept = db.query(User.department_id).all() # basic safeguard
            assets_in_scope = []
            
    for asset in assets_in_scope:
        audit_item = AuditItem(
            audit_cycle_id=new_cycle.id,
            asset_id=asset.id,
            verified_by=None,
            result=None,
            notes=None,
            verified_at=None
        )
        db.add(audit_item)
        
    db.commit()
    
    log_activity(
        db, 
        admin_user.id, 
        f"Created Audit Cycle '{new_cycle.name}' with {len(assets_in_scope)} items", 
        "AuditCycle", 
        new_cycle.id
    )
    
    return new_cycle

@router.get("/{cycle_id}", response_model=AuditCycleResponse)
def get_audit_cycle(
    cycle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cycle = db.query(AuditCycle).filter(AuditCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit cycle not found"
        )
    return cycle

@router.post("/{cycle_id}/auditors")
def assign_auditors(
    cycle_id: int,
    assignment: AuditorsAssign,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    cycle = db.query(AuditCycle).filter(AuditCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit cycle not found"
        )
        
    # Clear previous assignments
    db.query(AuditorAssignment).filter(AuditorAssignment.audit_cycle_id == cycle_id).delete()
    
    # Assign new auditors
    for aud_id in assignment.auditor_ids:
        # Check if user exists
        user_exists = db.query(User).filter(User.id == aud_id).first()
        if not user_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Auditor User ID {aud_id} not found"
            )
        new_assign = AuditorAssignment(
            audit_cycle_id=cycle_id,
            auditor_id=aud_id
        )
        db.add(new_assign)
        
        # Notify auditor
        create_notification(
            db,
            aud_id,
            "BookingConfirmed",  # generic assignment category
            f"You have been assigned as an auditor for cycle '{cycle.name}'.",
            "AuditCycle",
            cycle.id
        )
        
    db.commit()
    
    log_activity(
        db, 
        admin_user.id, 
        f"Assigned {len(assignment.auditor_ids)} auditors to Cycle ID {cycle.id}", 
        "AuditCycle", 
        cycle.id
    )
    
    return {"message": "Auditors assigned successfully"}

@router.get("/{cycle_id}/items", response_model=List[AuditItemResponse])
def list_audit_items(
    cycle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(AuditItem).filter(AuditItem.audit_cycle_id == cycle_id).all()

@router.patch("/{cycle_id}/items/{asset_id}", response_model=AuditItemResponse)
def verify_audit_item(
    cycle_id: int,
    asset_id: int,
    item_data: AuditItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cycle = db.query(AuditCycle).filter(AuditCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit cycle not found"
        )
        
    if cycle.status == "Closed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot verify items on a closed audit cycle"
        )
        
    # Verify the current user is assigned auditor (or admin)
    is_assigned = db.query(AuditorAssignment).filter(
        AuditorAssignment.audit_cycle_id == cycle_id,
        AuditorAssignment.auditor_id == current_user.id
    ).first()
    
    if current_user.role != "Admin" and not is_assigned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only assigned auditors or admins can verify audit items"
        )
        
    item = db.query(AuditItem).filter(
        AuditItem.audit_cycle_id == cycle_id,
        AuditItem.asset_id == asset_id
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit item not found in this cycle"
        )
        
    # Update item
    item.result = item_data.result
    item.notes = item_data.notes
    item.verified_by = current_user.id
    item.verified_at = datetime.utcnow()
    
    # Auto-generate discrepancy report entry if Missing or Damaged
    if item_data.result in ["Missing", "Damaged"]:
        existing_report = db.query(DiscrepancyReport).filter(
            DiscrepancyReport.audit_cycle_id == cycle_id,
            DiscrepancyReport.asset_id == asset_id
        ).first()
        
        if not existing_report:
            new_report = DiscrepancyReport(
                audit_cycle_id=cycle_id,
                asset_id=asset_id,
                discrepancy_type=item_data.result,
                resolution_status="Open"
            )
            db.add(new_report)
            
            # Notify asset managers of discrepancy
            managers = db.query(User).filter(User.role == "AssetManager").all()
            for mgr in managers:
                create_notification(
                    db,
                    mgr.id,
                    "AuditDiscrepancy",
                    f"Discrepancy flagged: Asset ID {asset_id} is marked as {item_data.result}.",
                    "AuditCycle",
                    cycle_id
                )
                
    db.commit()
    db.refresh(item)
    
    log_activity(
        db, 
        current_user.id, 
        f"Verified Asset ID {asset_id} in Audit Cycle ID {cycle_id} as {item_data.result}", 
        "AuditItem", 
        item.id
    )
    
    return item

@router.get("/{cycle_id}/discrepancies", response_model=List[DiscrepancyResponse])
def get_cycle_discrepancies(
    cycle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(DiscrepancyReport).filter(DiscrepancyReport.audit_cycle_id == cycle_id).all()

@router.patch("/{cycle_id}/close", response_model=AuditCycleResponse)
def close_audit_cycle(
    cycle_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    cycle = db.query(AuditCycle).filter(AuditCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit cycle not found"
        )
        
    if cycle.status == "Closed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audit cycle is already closed"
        )
        
    # Check if there are unverified items
    unverified_count = db.query(AuditItem).filter(
        AuditItem.audit_cycle_id == cycle_id,
        AuditItem.result == None
    ).count()
    
    # We can close even with unverified items, but let's log them or check
    # Lock cycle
    cycle.status = "Closed"
    cycle.updated_at = datetime.utcnow()
    
    # Update affected asset statuses (Missing -> Lost)
    items = db.query(AuditItem).filter(AuditItem.audit_cycle_id == cycle_id).all()
    for item in items:
        if item.result == "Missing":
            asset = db.query(Asset).filter(Asset.id == item.asset_id).first()
            if asset:
                asset.status = "Lost"
        elif item.result == "Damaged":
            asset = db.query(Asset).filter(Asset.id == item.asset_id).first()
            if asset:
                asset.condition = "Damaged"
                
    db.commit()
    db.refresh(cycle)
    
    log_activity(db, admin_user.id, f"Closed Audit Cycle '{cycle.name}'", "AuditCycle", cycle.id)
    
    return cycle
