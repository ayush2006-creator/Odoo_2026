from pydantic import BaseModel, model_validator
from datetime import datetime
from typing import Optional

class BookingCreate(BaseModel):
    resource_id: int
    start_time: datetime
    end_time: datetime
    purpose: Optional[str] = None

    @model_validator(mode='after')
    def validate_times(self) -> 'BookingCreate':
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time")
        return self

class BookingReschedule(BaseModel):
    start_time: datetime
    end_time: datetime

    @model_validator(mode='after')
    def validate_times(self) -> 'BookingReschedule':
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time")
        return self

class BookingResponse(BaseModel):
    id: int
    resource_id: int
    booked_by: int
    start_time: datetime
    end_time: datetime
    purpose: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
