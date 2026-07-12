from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List, Optional

from app.database import get_db
from app.models.activity import ActivityLog
from app.models.user import User
from app.core.security import require_department_head
from app.schemas.activity import ActivityLogResponse

router = APIRouter(
    prefix="/activity-logs",
    tags=["Activity Logs"]
)

@router.get("", response_model=List[ActivityLogResponse])
def list_activity_logs(
    user_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_department_head)
):
    query = db.query(ActivityLog)
    if user_id is not None:
        query = query.filter(ActivityLog.user_id == user_id)
    if entity_type is not None:
        query = query.filter(ActivityLog.entity_type == entity_type)
    if start_date is not None:
        query = query.filter(ActivityLog.timestamp >= datetime.combine(start_date, datetime.min.time()))
    if end_date is not None:
        query = query.filter(ActivityLog.timestamp <= datetime.combine(end_date, datetime.max.time()))
        
    return query.order_by(ActivityLog.timestamp.desc()).all()
