from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    message: str
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
