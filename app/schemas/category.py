from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict

class AssetCategoryCreate(BaseModel):
    name: str
    custom_fields: Optional[Dict[str, str]] = {}  # e.g., {"warranty_period": "int"}

class AssetCategoryUpdate(BaseModel):
    name: Optional[str] = None
    custom_fields: Optional[Dict[str, str]] = None

class AssetCategoryResponse(BaseModel):
    id: int
    name: str
    custom_fields: Dict[str, str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
