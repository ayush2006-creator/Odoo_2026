from sqlalchemy import Column, Integer, String, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base

class AssetAllocation(Base):
    __tablename__ = "asset_allocations"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    holder_type = Column(String, nullable=False)  # Employee, Department
    holder_id = Column(Integer, nullable=False)  # User.id or Department.id
    allocated_date = Column(Date, default=lambda: datetime.utcnow().date())
    expected_return_date = Column(Date, nullable=True)
    actual_return_date = Column(Date, nullable=True)
    status = Column(String, default="Active")  # Active, Returned, Overdue
    condition_check_in_notes = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    asset = relationship("Asset", back_populates="allocations")
    creator = relationship("User", foreign_keys=[created_by])
