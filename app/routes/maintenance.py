from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from app.database import get_db
from app.models.maintenance import MaintenanceRequest
from app.models.asset import Asset
from app.models.user import User
from app.core.security import require_asset_manager, get_current_user
from app.schemas.maintenance import (
    MaintenanceResponse,
    MaintenanceCreate,
    MaintenanceAssign,
    MaintenanceResolve
)
from app.services.activity_service import log_activity, create_notification

router = APIRouter(
    prefix="/maintenance-requests",
    tags=["Maintenance"]
)

@router.get("", response_model=List[MaintenanceResponse])
def list_maintenance_requests(
    asset_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MaintenanceRequest)
    if asset_id is not None:
        query = query.filter(MaintenanceRequest.asset_id == asset_id)
    if status_filter is not None:
        query = query.filter(MaintenanceRequest.status == status_filter)
    if priority is not None:
        query = query.filter(MaintenanceRequest.priority == priority)
    return query.order_by(MaintenanceRequest.created_at.desc()).all()

@router.post("", response_model=MaintenanceResponse)
def create_maintenance_request(
    req_data: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == req_data.asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
        
    new_req = MaintenanceRequest(
        asset_id=req_data.asset_id,
        raised_by=current_user.id,
        issue_description=req_data.issue_description,
        priority=req_data.priority or "Low",
        photo=req_data.photo,
        status="Pending"
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    
    log_activity(db, current_user.id, f"Raised Maintenance Request for {asset.name} ({asset.asset_tag})", "MaintenanceRequest", new_req.id)
    
    # Notify Asset Manager
    # Find asset managers or broadcast. Here we simulate notify.
    return new_req

@router.get("/{request_id}", response_model=MaintenanceResponse)
def get_maintenance_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    req = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance request not found"
        )
    return req

@router.patch("/{request_id}/approve", response_model=MaintenanceResponse)
def approve_maintenance(
    request_id: int,
    db: Session = Depends(get_db),
    manager_user: User = Depends(require_asset_manager)
):
    req = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance request not found"
        )
        
    if req.status != "Pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Request is in {req.status} status and cannot be approved"
        )
        
    req.status = "Approved"
    req.approved_by = manager_user.id
    
    # Update Asset status to Under Maintenance
    asset = db.query(Asset).filter(Asset.id == req.asset_id).first()
    if asset:
        asset.status = "Under Maintenance"
        
    db.commit()
    db.refresh(req)
    
    # Notify employee who raised it
    create_notification(
        db,
        req.raised_by,
        "MaintenanceApproved",
        f"Your maintenance request for asset {asset.name if asset else 'Unknown'} was approved.",
        "MaintenanceRequest",
        req.id
    )
    
    log_activity(db, manager_user.id, f"Approved Maintenance Request ID {req.id}", "MaintenanceRequest", req.id)
    
    return req

@router.patch("/{request_id}/reject", response_model=MaintenanceResponse)
def reject_maintenance(
    request_id: int,
    db: Session = Depends(get_db),
    manager_user: User = Depends(require_asset_manager)
):
    req = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance request not found"
        )
        
    if req.status != "Pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Request is in {req.status} status and cannot be rejected"
        )
        
    req.status = "Rejected"
    req.approved_by = manager_user.id
    req.resolved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(req)
    
    # Notify employee who raised it
    asset = db.query(Asset).filter(Asset.id == req.asset_id).first()
    create_notification(
        db,
        req.raised_by,
        "MaintenanceRejected",
        f"Your maintenance request for asset {asset.name if asset else 'Unknown'} was rejected.",
        "MaintenanceRequest",
        req.id
    )
    
    log_activity(db, manager_user.id, f"Rejected Maintenance Request ID {req.id}", "MaintenanceRequest", req.id)
    
    return req

@router.patch("/{request_id}/assign-technician", response_model=MaintenanceResponse)
def assign_technician(
    request_id: int,
    assign_data: MaintenanceAssign,
    db: Session = Depends(get_db),
    manager_user: User = Depends(require_asset_manager)
):
    req = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance request not found"
        )
        
    # Verify technician exists
    tech = db.query(User).filter(User.id == assign_data.technician_id).first()
    if not tech:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Technician employee not found"
        )
        
    req.technician_id = assign_data.technician_id
    req.status = "TechnicianAssigned"
    
    db.commit()
    db.refresh(req)
    
    log_activity(
        db, 
        manager_user.id, 
        f"Assigned Technician {tech.name} to Maintenance Request ID {req.id}", 
        "MaintenanceRequest", 
        req.id
    )
    
    # Notify technician
    create_notification(
        db,
        tech.id,
        "AssetAssigned",  # general work ticket assignment
        f"You have been assigned to repair maintenance request ID {req.id}.",
        "MaintenanceRequest",
        req.id
    )
    
    return req

@router.patch("/{request_id}/start", response_model=MaintenanceResponse)
def start_maintenance(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    req = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance request not found"
        )
        
    # Only assigned technician or asset manager can start
    if current_user.role not in ["AssetManager", "Admin"] and req.technician_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned technician or Asset Manager can start work"
        )
        
    req.status = "InProgress"
    db.commit()
    db.refresh(req)
    
    log_activity(db, current_user.id, f"Started repairs on Maintenance Request ID {req.id}", "MaintenanceRequest", req.id)
    
    return req

@router.patch("/{request_id}/resolve", response_model=MaintenanceResponse)
def resolve_maintenance(
    request_id: int,
    resolve_data: MaintenanceResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    req = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance request not found"
        )
        
    # Only assigned technician or asset manager can resolve
    if current_user.role not in ["AssetManager", "Admin"] and req.technician_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned technician or Asset Manager can resolve work"
        )
        
    req.status = "Resolved"
    req.resolution_notes = resolve_data.resolution_notes
    req.resolved_at = datetime.utcnow()
    
    # Revert Asset status back to Available
    asset = db.query(Asset).filter(Asset.id == req.asset_id).first()
    if asset:
        asset.status = "Available"
        
    db.commit()
    db.refresh(req)
    
    # Notify employee who raised it
    create_notification(
        db,
        req.raised_by,
        "MaintenanceApproved",  # using approved as resolved notify type
        f"Your maintenance request for asset {asset.name if asset else 'Unknown'} has been resolved.",
        "MaintenanceRequest",
        req.id
    )
    
    log_activity(
        db, 
        current_user.id, 
        f"Resolved Maintenance Request ID {req.id}", 
        "MaintenanceRequest", 
        req.id, 
        {"notes": resolve_data.resolution_notes}
    )
    
    return req
