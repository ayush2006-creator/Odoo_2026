"""
AssetFlow - API Edge Cases & Error Handling Test
Verifies error status codes and response payloads for duplicate signups,
incorrect logins, unauthorized routes, insufficient permissions,
invalid bookings, and allocation conflicts.
"""
import requests
import sys
import random
from datetime import datetime, timedelta

# Reconfigure console output to UTF-8 for emoji support on Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

BASE_URL = "http://127.0.0.1:8001"

print("=" * 60)
print("      AssetFlow API Edge Cases & Error Handling Test       ")
print("=" * 60)

# 1. Check if server is running
try:
    r = requests.get(f"{BASE_URL}/")
    if r.status_code != 200:
         print(f"[ERROR] Local server returned status {r.status_code} on {BASE_URL}")
         sys.exit(1)
except requests.exceptions.ConnectionError:
    print(f"[ERROR] Local server is not running on {BASE_URL}. Please start uvicorn first.")
    sys.exit(1)

print("[OK] Local server is running.")

# Generate random emails for test runs
rand_id = random.randint(1000, 99999)
email_dup = f"dup_test_{rand_id}@test.com"
email_rbac = f"rbac_test_{rand_id}@test.com"

# ─────────────────────────────────────────────────────────────────
# 1. SIGNUP & AUTH EDGE CASES
# ─────────────────────────────────────────────────────────────────
print("\n--- 1. Auth & Signup Edge Cases ---")

# Register base user
r = requests.post(f"{BASE_URL}/auth/signup", json={"name": "Dup User", "email": email_dup, "password": "password123"})
if r.status_code == 200:
    print("  [OK] Registered first test employee user")

# Test 1.1: Duplicate Signup (Should fail 400)
r = requests.post(f"{BASE_URL}/auth/signup", json={"name": "Dup User", "email": email_dup, "password": "password123"})
if r.status_code == 400:
    print("  [PASS] Test 1.1: Register duplicate email -> 400 Bad Request (Email exists)")
else:
    print(f"  [FAIL] Test 1.1: Register duplicate email -> Expected 400, got {r.status_code} ({r.text})")

# Test 1.2: Login with wrong password (Should fail 401)
r = requests.post(f"{BASE_URL}/auth/login", json={"email": email_dup, "password": "wrongpassword"})
if r.status_code == 401:
    print("  [PASS] Test 1.2: Login with wrong password -> 401 Unauthorized")
else:
    print(f"  [FAIL] Test 1.2: Login with wrong password -> Expected 401, got {r.status_code}")

# Test 1.3: Access protected route without token (Should fail 401)
r = requests.get(f"{BASE_URL}/employees")
if r.status_code == 401:
    print("  [PASS] Test 1.3: Access /employees without token -> 401 Unauthorized")
else:
    print(f"  [FAIL] Test 1.3: Access /employees without token -> Expected 401, got {r.status_code}")

# ─────────────────────────────────────────────────────────────────
# 2. RBAC / ACCESS LEVEL EDGE CASES
# ─────────────────────────────────────────────────────────────────
print("\n--- 2. RBAC Edge Cases ---")

# Get Employee Token
r_login = requests.post(f"{BASE_URL}/auth/login", json={"email": email_dup, "password": "password123"})
emp_token = r_login.json().get("access_token")

# Test 2.1: Promote employee using employee token (Should fail 403)
r = requests.patch(
    f"{BASE_URL}/employees/1/role", 
    json={"role": "Admin"}, 
    headers={"Authorization": f"Bearer {emp_token}"}
)
if r.status_code == 403:
    print("  [PASS] Test 2.1: Promote employee role using employee token -> 403 Forbidden")
else:
    print(f"  [FAIL] Test 2.1: Promote employee role using employee token -> Expected 403, got {r.status_code} ({r.text})")

# ─────────────────────────────────────────────────────────────────
# 3. BOOKING EDGE CASES
# ─────────────────────────────────────────────────────────────────
print("\n--- 3. Booking Edge Cases ---")

# Get Admin Token
r_admin = requests.post(f"{BASE_URL}/auth/login", json={"email": "admin@test.com", "password": "newpass123"})
admin_token = r_admin.json().get("access_token")

if not admin_token:
    print("  [WARN] Admin login failed. Seed database or run verify_endpoints.py first to initialize admin.")
    sys.exit(1)

# Fetch Categories
r_cat = requests.get(f"{BASE_URL}/asset-categories", headers={"Authorization": f"Bearer {admin_token}"})
cat_id = None
if r_cat.status_code == 200 and r_cat.json():
    cat_id = r_cat.json()[0].get("id")
else:
    # Create category
    r_create_cat = requests.post(
        f"{BASE_URL}/asset-categories", 
        json={"name": f"Temp Cat {rand_id}", "custom_fields": {}},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    cat_id = r_create_cat.json().get("id")

# Create non-bookable asset
r_asset = requests.post(
    f"{BASE_URL}/assets",
    json={"name": "Office Laptop", "category_id": cat_id, "is_bookable": False},
    headers={"Authorization": f"Bearer {admin_token}"}
)
non_bookable_id = r_asset.json().get("id")

# Test 3.1: Book non-bookable asset (Should fail 400)
r = requests.post(
    f"{BASE_URL}/bookings",
    json={
        "resource_id": non_bookable_id,
        "start_time": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
        "end_time": (datetime.utcnow() + timedelta(hours=2)).isoformat()
    },
    headers={"Authorization": f"Bearer {emp_token}"}
)
if r.status_code == 400:
    print("  [PASS] Test 3.1: Book non-bookable asset -> 400 Bad Request (Asset not bookable)")
else:
    print(f"  [FAIL] Test 3.1: Book non-bookable asset -> Expected 400, got {r.status_code} ({r.text})")

# Test 3.2: Book with start_time after end_time (Should fail 422/400)
r = requests.post(
    f"{BASE_URL}/bookings",
    json={
        "resource_id": non_bookable_id,
        "start_time": (datetime.utcnow() + timedelta(hours=5)).isoformat(),
        "end_time": (datetime.utcnow() + timedelta(hours=2)).isoformat()
    },
    headers={"Authorization": f"Bearer {emp_token}"}
)
if r.status_code in [400, 422]:
    print(f"  [PASS] Test 3.2: Book with start_time after end_time -> {r.status_code} Validation Error")
else:
    print(f"  [FAIL] Test 3.2: Book with start_time after end_time -> Expected 400/422, got {r.status_code} ({r.text})")

# ─────────────────────────────────────────────────────────────────
# 4. ALLOCATION EDGE CASES
# ─────────────────────────────────────────────────────────────────
print("\n--- 4. Allocation Edge Cases ---")

# Retrieve an asset to allocate
r_assets = requests.get(f"{BASE_URL}/assets", headers={"Authorization": f"Bearer {admin_token}"})
if r_assets.status_code == 200 and r_assets.json():
    asset_id = r_assets.json()[0].get("id")
    
    # Make sure it's allocated to user 1 first (to generate conflict)
    # Revert if it was allocated, or just make sure it's allocated
    requests.post(
        f"{BASE_URL}/allocations",
        json={"asset_id": asset_id, "holder_type": "Employee", "holder_id": 1},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    # Test 4.1: Double allocate same asset (Should fail 409 and return current holder details)
    r = requests.post(
        f"{BASE_URL}/allocations",
        json={"asset_id": asset_id, "holder_type": "Employee", "holder_id": 2},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if r.status_code == 409:
        payload = r.json()
        detail = payload.get("detail", {})
        holder_name = detail.get("holder_name") if isinstance(detail, dict) else None
        if holder_name:
            print(f"  [PASS] Test 4.1: Double allocate -> 409 Conflict. Current holder: '{holder_name}'")
        else:
            print(f"  [FAIL] Test 4.1: Double allocate -> Got 409, but missing holder details in body: {payload}")
    else:
        print(f"  [FAIL] Test 4.1: Double allocate -> Expected 409, got {r.status_code} ({r.text})")
else:
    print("  [WARN] No assets available to run allocation conflict tests.")

print("\n" + "=" * 60)
print("                    Tests Completed                       ")
print("=" * 60)
