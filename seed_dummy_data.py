"""
AssetFlow - Full Database Seeding Script
Generates:
  - 5 users per role (Admin, AssetManager, DepartmentHead, Employee) -- password: pass123
  - 4 Departments (Engineering, HR, Finance, Operations)
  - 5 Asset Categories (Electronics, Furniture, Vehicles, Office Supplies, Meeting Rooms)
  - 20 Assets: mix of bookable (shared) and non-bookable (personal/unshared)
"""
from datetime import date
from app.database import SessionLocal, engine, Base
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
from app.core.security import hash_password
import re

# Ensure all tables exist
Base.metadata.create_all(bind=engine)


def seed_or_get(db, model, filter_kwargs, create_kwargs):
    """Helper: return existing row or create a new one."""
    obj = db.query(model).filter_by(**filter_kwargs).first()
    if not obj:
        obj = model(**{**filter_kwargs, **create_kwargs})
        db.add(obj)
        db.flush()   # get the id without committing
    return obj


def next_asset_tag(db):
    """Generate next sequential AF-XXXX tag."""
    tags = db.query(Asset.asset_tag).filter(Asset.asset_tag.like("AF-%")).all()
    if not tags:
        return "AF-0001"
    numbers = []
    for (t,) in tags:
        m = re.match(r"AF-(\d+)", t)
        if m:
            numbers.append(int(m.group(1)))
    return f"AF-{max(numbers) + 1:04d}" if numbers else "AF-0001"


def seed():
    db = SessionLocal()
    try:
        # ───────────── USERS ─────────────
        user_specs = [
            # Admins
            ("Rahul Sharma",   "admin1@test.com",    "Admin"),
            ("Priya Patel",    "admin2@test.com",    "Admin"),
            ("Ankit Gupta",    "admin3@test.com",    "Admin"),
            ("Sneha Reddy",    "admin4@test.com",    "Admin"),
            ("Vikram Singh",   "admin5@test.com",    "Admin"),
            # Asset Managers
            ("Neha Kapoor",    "manager1@test.com",  "AssetManager"),
            ("Arjun Mehta",    "manager2@test.com",  "AssetManager"),
            ("Kavita Joshi",   "manager3@test.com",  "AssetManager"),
            ("Rohan Das",      "manager4@test.com",  "AssetManager"),
            ("Meera Iyer",     "manager5@test.com",  "AssetManager"),
            # Department Heads
            ("Suresh Nair",    "head1@test.com",     "DepartmentHead"),
            ("Lakshmi Rao",    "head2@test.com",     "DepartmentHead"),
            ("Deepak Verma",   "head3@test.com",     "DepartmentHead"),
            ("Anjali Desai",   "head4@test.com",     "DepartmentHead"),
            ("Kiran Kumar",    "head5@test.com",     "DepartmentHead"),
            # Employees
            ("Amit Tiwari",    "employee1@test.com", "Employee"),
            ("Pooja Saxena",   "employee2@test.com", "Employee"),
            ("Sanjay Mishra",  "employee3@test.com", "Employee"),
            ("Ritu Agarwal",   "employee4@test.com", "Employee"),
            ("Manish Pandey",  "employee5@test.com", "Employee"),
        ]

        user_count = 0
        for name, email, role in user_specs:
            existing = db.query(User).filter(User.email == email).first()
            if not existing:
                db.add(User(
                    name=name, email=email,
                    hashed_password=hash_password("pass123"),
                    role=role, status="Active"
                ))
                user_count += 1
            else:
                existing.role = role
                existing.status = "Active"
                existing.name = name

        db.flush()
        print(f"  Users: {user_count} new  (password for all: pass123)")

        # ───────────── DEPARTMENTS ─────────────
        dept_specs = [
            ("Engineering",      None),
            ("Human Resources",  None),
            ("Finance",          None),
            ("Operations",       None),
        ]
        dept_count = 0
        for dname, parent in dept_specs:
            obj = seed_or_get(db, Department, {"name": dname}, {"status": "Active"})
            if obj.id is None:
                dept_count += 1
        db.flush()
        print(f"  Departments: {dept_count} new")

        # ───────────── ASSET CATEGORIES ─────────────
        cat_specs = [
            ("Electronics",      {"warranty_months": "integer"}),
            ("Furniture",        {}),
            ("Vehicles",         {"mileage": "integer", "fuel_type": "string"}),
            ("Office Supplies",  {}),
            ("Meeting Rooms",    {"capacity": "integer", "has_projector": "boolean"}),
        ]
        cat_map = {}   # name -> id
        cat_count = 0
        for cname, cfields in cat_specs:
            obj = seed_or_get(db, AssetCategory, {"name": cname}, {"custom_fields": cfields})
            cat_map[cname] = obj.id
            if obj.id is None:
                cat_count += 1
        db.flush()
        # Refresh ids
        for cname, _ in cat_specs:
            cat_map[cname] = db.query(AssetCategory).filter(AssetCategory.name == cname).first().id
        print(f"  Categories: {cat_count} new")

        # ───────────── ASSETS ─────────────
        # (name, category, serial, condition, location, bookable, cost)
        asset_specs = [
            # ── Non-bookable / personal assets ──
            ("MacBook Pro 16-inch M3",    "Electronics",     "SN-MBP-001",  "New",       "Bldg A - Floor 2",  False, 2499.00),
            ("MacBook Air 15-inch",       "Electronics",     "SN-MBA-002",  "New",       "Bldg A - Floor 3",  False, 1799.00),
            ("Dell XPS 15 Laptop",        "Electronics",     "SN-DELL-003", "Good",      "Bldg B - Floor 1",  False, 1599.00),
            ("ThinkPad X1 Carbon",        "Electronics",     "SN-LNV-004",  "Good",      "Bldg A - Floor 1",  False, 1499.00),
            ("iPhone 15 Pro",             "Electronics",     "SN-IPH-005",  "New",       "Bldg A - Floor 2",  False, 1199.00),
            ("Samsung Galaxy S24",        "Electronics",     "SN-SAM-006",  "New",       "Bldg B - Floor 2",  False,  999.00),
            ("Ergonomic Standing Desk",   "Furniture",       "SN-DSK-007",  "New",       "Bldg A - Floor 1",  False,  899.00),
            ("Herman Miller Aeron Chair", "Furniture",       "SN-CHR-008",  "Good",      "Bldg A - Floor 2",  False, 1395.00),
            ("Executive Office Desk",     "Furniture",       "SN-DSK-009",  "New",       "Bldg B - Floor 1",  False,  750.00),
            ("Filing Cabinet (4-drawer)", "Office Supplies", "SN-CAB-010",  "Good",      "Bldg A - Floor 1",  False,  320.00),
            ("Toyota Innova Crysta",      "Vehicles",        "SN-VEH-011",  "Good",      "Parking Lot A",     False, 22000.00),
            ("Maruti Suzuki Ertiga",      "Vehicles",        "SN-VEH-012",  "Fair",      "Parking Lot B",     False, 12000.00),

            # ── Bookable / shared assets ──
            ("Conference Room Alpha",     "Meeting Rooms",   "SN-RM-101",   "Excellent", "Bldg A - Floor 3",  True,     0.00),
            ("Conference Room Beta",      "Meeting Rooms",   "SN-RM-102",   "Excellent", "Bldg A - Floor 2",  True,     0.00),
            ("Conference Room Gamma",     "Meeting Rooms",   "SN-RM-103",   "Good",      "Bldg B - Floor 1",  True,     0.00),
            ("Board Room (12-seat)",      "Meeting Rooms",   "SN-RM-104",   "Excellent", "Bldg A - Floor 4",  True,     0.00),
            ("Epson Projector EB-992F",   "Electronics",     "SN-PRJ-013",  "New",       "Bldg A - Floor 3",  True,   850.00),
            ("BenQ Portable Projector",   "Electronics",     "SN-PRJ-014",  "Good",      "Bldg B - Floor 1",  True,   650.00),
            ("Shared Company Van",        "Vehicles",        "SN-VEH-015",  "Good",      "Parking Lot A",     True, 18000.00),
            ("Shared Pool Car (Sedan)",   "Vehicles",        "SN-VEH-016",  "Fair",      "Parking Lot B",     True, 10000.00),
        ]

        asset_count = 0
        for aname, acat, serial, cond, loc, bookable, cost in asset_specs:
            existing = db.query(Asset).filter(Asset.serial_number == serial).first()
            if not existing:
                tag = next_asset_tag(db)
                db.add(Asset(
                    asset_tag=tag,
                    name=aname,
                    category_id=cat_map[acat],
                    serial_number=serial,
                    condition=cond,
                    location=loc,
                    is_bookable=bookable,
                    acquisition_cost=cost,
                    acquisition_date=date(2026, 1, 15),
                    status="Available",
                    current_holder_type="None",
                    current_holder_id=None,
                    photos_docs=[],
                    custom_values={}
                ))
                db.flush()
                asset_count += 1

        print(f"  Assets: {asset_count} new  ({sum(1 for a in asset_specs if a[5])} bookable / {sum(1 for a in asset_specs if not a[5])} non-bookable)")

        db.commit()
        print("\nSeeding complete!")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 50)
    print("  AssetFlow - Database Seeder")
    print("=" * 50)
    seed()
