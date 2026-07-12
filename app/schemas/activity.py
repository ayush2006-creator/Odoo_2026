from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any, Dict

class ActivityLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    details: Dict[str, Any]
    timestamp: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
