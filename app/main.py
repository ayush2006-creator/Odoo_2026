from fastapi import FastAPI
from app.database import Base, engine

# Import all models to ensure they are registered with SQLAlchemy Base metadata
from app.models.user import User
from app.models.department import Department
from app.models.category import AssetCategory
from app.models.asset import Asset
from app.models.allocation import AssetAllocation
from app.models.transfer import TransferRequest
from app.models.booking import Booking
from app.models.maintenance import MaintenanceRequest
from app.models.audit import AuditCycle, AuditorAssignment, AuditItem, DiscrepancyReport
from app.models.notification import Notification
from app.models.activity import ActivityLog

# Create tables in database (does not drop existing data, only creates missing tables)
Base.metadata.create_all(bind=engine)

# Import all routes
from app.routes.auth import router as auth_router
from app.routes.employees import router as employees_router
from app.routes.departments import router as departments_router
from app.routes.asset_categories import router as asset_categories_router
from app.routes.assets import router as assets_router
from app.routes.allocations import router as allocations_router
from app.routes.transfers import router as transfers_router
from app.routes.bookings import router as bookings_router
from app.routes.maintenance import router as maintenance_router
from app.routes.audit import router as audit_router
from app.routes.dashboard import router as dashboard_router
from app.routes.reports import router as reports_router
from app.routes.notifications import router as notifications_router
from app.routes.activity_logs import router as activity_logs_router

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AssetFlow API",
    description="Backend API for Enterprise Asset & Resource Management System (Odoo Hackathon 2026)",
    version="1.0.0"
)

# Allow all CORS origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include all routers
app.include_router(auth_router)
app.include_router(employees_router)
app.include_router(departments_router)
app.include_router(asset_categories_router)
app.include_router(assets_router)
app.include_router(allocations_router)
app.include_router(transfers_router)
app.include_router(bookings_router)
app.include_router(maintenance_router)
app.include_router(audit_router)
app.include_router(dashboard_router)
app.include_router(reports_router)
app.include_router(notifications_router)
app.include_router(activity_logs_router)

@app.get("/")
def root():
    return {
        "message": "AssetFlow Backend API is running 🚀",
        "version": "1.0.0",
        "docs_url": "/docs"
    }