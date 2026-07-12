from sqlalchemy import Column, Integer, String, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base

class AuditCycle(Base):
    __tablename__ = "audit_cycles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    scope_type = Column(String, nullable=False)  # Department, Location
    scope_value = Column(String, nullable=False)  # Department name/id or Location name
    date_range_start = Column(Date, nullable=False)
    date_range_end = Column(Date, nullable=False)
    status = Column(String, default="Open")  # Open, Closed
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    assignments = relationship("AuditorAssignment", back_populates="audit_cycle", cascade="all, delete-orphan")
    items = relationship("AuditItem", back_populates="audit_cycle", cascade="all, delete-orphan")
    discrepancies = relationship("DiscrepancyReport", back_populates="audit_cycle", cascade="all, delete-orphan")


class AuditorAssignment(Base):
    __tablename__ = "auditor_assignments"

    id = Column(Integer, primary_key=True, index=True)
    audit_cycle_id = Column(Integer, ForeignKey("audit_cycles.id", ondelete="CASCADE"), nullable=False)
    auditor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    audit_cycle = relationship("AuditCycle", back_populates="assignments")
    auditor = relationship("User")


class AuditItem(Base):
    __tablename__ = "audit_items"

    id = Column(Integer, primary_key=True, index=True)
    audit_cycle_id = Column(Integer, ForeignKey("audit_cycles.id", ondelete="CASCADE"), nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    verified_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    result = Column(String, nullable=True)  # Verified, Missing, Damaged
    notes = Column(String, nullable=True)
    verified_at = Column(DateTime, nullable=True)

    # Relationships
    audit_cycle = relationship("AuditCycle", back_populates="items")
    asset = relationship("Asset")
    verifier = relationship("User")


class DiscrepancyReport(Base):
    __tablename__ = "discrepancy_reports"

    id = Column(Integer, primary_key=True, index=True)
    audit_cycle_id = Column(Integer, ForeignKey("audit_cycles.id", ondelete="CASCADE"), nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    discrepancy_type = Column(String, nullable=False)  # Missing, Damaged
    resolution_status = Column(String, default="Open")  # Open, Resolved
    resolved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    audit_cycle = relationship("AuditCycle", back_populates="discrepancies")
    asset = relationship("Asset")
    resolver = relationship("User")
