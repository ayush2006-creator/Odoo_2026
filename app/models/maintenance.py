from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base

class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    raised_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    issue_description = Column(String, nullable=False)
    priority = Column(String, default="Low")  # Low, Medium, High, Critical
    photo = Column(String, nullable=True)  # file ref / URL
    status = Column(String, default="Pending")  # Pending, Approved, Rejected, TechnicianAssigned, InProgress, Resolved
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    technician_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    asset = relationship("Asset", back_populates="maintenance_requests")
    requester = relationship("User", foreign_keys=[raised_by])
    approver = relationship("User", foreign_keys=[approved_by])
    technician = relationship("User", foreign_keys=[technician_id])
