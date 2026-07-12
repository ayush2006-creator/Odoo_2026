from sqlalchemy.orm import Session
from app.models.activity import ActivityLog
from app.models.notification import Notification

def log_activity(
    db: Session,
    user_id: int,
    action: str,
    entity_type: str = None,
    entity_id: int = None,
    details: dict = None
) -> ActivityLog:
    if details is None:
        details = {}
    db_log = ActivityLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

def create_notification(
    db: Session,
    user_id: int,
    type: str,
    message: str,
    related_entity_type: str = None,
    related_entity_id: int = None
) -> Notification:
    db_notif = Notification(
        user_id=user_id,
        type=type,
        message=message,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id
    )
    db.add(db_notif)
    db.commit()
    db.refresh(db_notif)
    return db_notif
