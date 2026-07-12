from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.core.security import get_current_user
from app.schemas.notification import NotificationResponse

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)

@router.get("", response_model=List[NotificationResponse])
def list_notifications(
    read: Optional[bool] = None,
    notification_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if read is not None:
        query = query.filter(Notification.read == read)
    if notification_type is not None:
        query = query.filter(Notification.type == notification_type)
    return query.order_by(Notification.created_at.desc()).all()

@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
        
    notif.read = True
    db.commit()
    db.refresh(notif)
    return notif
