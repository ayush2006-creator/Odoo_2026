#!/bin/bash
# AssetFlow - Edge Cases Test Script

BASE_URL="http://127.0.0.1:8001"
echo "=========================================================="
echo "      AssetFlow API Edge Cases & Error Handling Test       "
echo "=========================================================="

# Helpers for colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test endpoint
status_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [ "$status_code" -ne 200 ]; then
    echo -e "${RED}[ERROR] Local server is not running on $BASE_URL. Please start uvicorn first.${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] Local server is running.${NC}"

# Seed test variables
RANDOM_NUM=$((1 + RANDOM % 100000))
EMAIL_DUPLICATE="test_dup_${RANDOM_NUM}@test.com"
EMAIL_RBAC="test_rbac_${RANDOM_NUM}@test.com"

# ─────────────────────────────────────────────────────────────────
# 1. SIGNUP & AUTH EDGE CASES
# ─────────────────────────────────────────────────────────────────
echo -e "\n--- 1. Auth & Signup Edge Cases ---"

# Step 1a: Create base user
echo "Registering user..."
curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Duplicate User\", \"email\": \"$EMAIL_DUPLICATE\", \"password\": \"secure123\"}" > /dev/null

# Step 1b: Duplicate Signup (Should fail 400)
echo -n "Test 1.1: Register duplicate email -> "
resp_1_1=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Duplicate User\", \"email\": \"$EMAIL_DUPLICATE\", \"password\": \"secure123\"}" \
  -w " | STATUS: %{http_code}")
if [[ "$resp_1_1" == *"STATUS: 400"* ]]; then
    echo -e "${GREEN}PASS (400 Bad Request: Email exists)${NC}"
else
    echo -e "${RED}FAIL: $resp_1_1${NC}"
fi

# Step 1c: Login with wrong password (Should fail 401)
echo -n "Test 1.2: Login with wrong password -> "
resp_1_2=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL_DUPLICATE\", \"password\": \"wrongpass\"}" \
  -w " | STATUS: %{http_code}")
if [[ "$resp_1_2" == *"STATUS: 401"* ]]; then
    echo -e "${GREEN}PASS (401 Unauthorized: Invalid creds)${NC}"
else
    echo -e "${RED}FAIL: $resp_1_2${NC}"
fi

# Step 1d: Access protected route without token (Should fail 401)
echo -n "Test 1.3: Access /employees without token -> "
resp_1_3=$(curl -s -X GET "$BASE_URL/employees" -w " | STATUS: %{http_code}")
if [[ "$resp_1_3" == *"STATUS: 401"* ]]; then
    echo -e "${GREEN}PASS (401 Unauthorized: Missing token)${NC}"
else
    echo -e "${RED}FAIL: $resp_1_3${NC}"
fi

# ─────────────────────────────────────────────────────────────────
# 2. RBAC / ACCESS LEVEL EDGE CASES
# ─────────────────────────────────────────────────────────────────
echo -e "\n--- 2. RBAC Edge Cases ---"

# Step 2a: Log in as Employee to get Employee Token
EMP_TOKEN_JSON=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL_DUPLICATE\", \"password\": \"secure123\"}")
EMP_TOKEN=$(echo "$EMP_TOKEN_JSON" | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$')

# Step 2b: Try to promote self using employee token (Should fail 403)
echo -n "Test 2.1: Promote employee role using employee token -> "
resp_2_1=$(curl -s -X PATCH "$BASE_URL/employees/1/role" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "Admin"}' \
  -w " | STATUS: %{http_code}")
if [[ "$resp_2_1" == *"STATUS: 403"* ]]; then
    echo -e "${GREEN}PASS (403 Forbidden: Insufficient permissions)${NC}"
else
    echo -e "${RED}FAIL: $resp_2_1${NC}"
fi

# ─────────────────────────────────────────────────────────────────
# 3. BOOKING EDGE CASES
# ─────────────────────────────────────────────────────────────────
echo -e "\n--- 3. Booking Edge Cases ---"

# We need an admin/manager token to register categories/assets first
ADMIN_TOKEN_JSON=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "newpass123"}')
ADMIN_TOKEN=$(echo "$ADMIN_TOKEN_JSON" | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}[WARN] Admin token not fetched. Run verification script once to seed admin/manager first.${NC}"
    exit 1
fi

# Get Categories
CAT_ID=$(curl -s -X GET "$BASE_URL/asset-categories" -H "Authorization: Bearer $ADMIN_TOKEN" | grep -o '"id":[0-9]*' | head -n 1 | grep -o '[0-9]*')
if [ -z "$CAT_ID" ]; then
    # Create category
    CAT_JSON=$(curl -s -X POST "$BASE_URL/asset-categories" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"name": "Temp Electronics", "custom_fields": {}}')
    CAT_ID=$(echo "$CAT_JSON" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
fi

# Create non-bookable asset
NON_BOOKABLE_JSON=$(curl -s -X POST "$BASE_URL/assets" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Non Bookable PC\", \"category_id\": $CAT_ID, \"is_bookable\": false}")
NON_BOOKABLE_ID=$(echo "$NON_BOOKABLE_JSON" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

# Step 3a: Book non-bookable asset (Should fail 400)
echo -n "Test 3.1: Book non-bookable asset -> "
resp_3_1=$(curl -s -X POST "$BASE_URL/bookings" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"resource_id\": $NON_BOOKABLE_ID, \"start_time\": \"2026-08-01T10:00:00\", \"end_time\": \"2026-08-01T12:00:00\"}" \
  -w " | STATUS: %{http_code}")
if [[ "$resp_3_1" == *"STATUS: 400"* ]]; then
    echo -e "${GREEN}PASS (400 Bad Request: Asset not bookable)${NC}"
else
    echo -e "${RED}FAIL: $resp_3_1${NC}"
fi

# Step 3b: Booking with start_time > end_time (Should fail 422/400)
echo -n "Test 3.2: Book with start_time after end_time -> "
resp_3_2=$(curl -s -X POST "$BASE_URL/bookings" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"resource_id\": $NON_BOOKABLE_ID, \"start_time\": \"2026-08-01T15:00:00\", \"end_time\": \"2026-08-01T10:00:00\"}" \
  -w " | STATUS: %{http_code}")
if [[ "$resp_3_2" == *"STATUS: 422"* || "$resp_3_2" == *"STATUS: 400"* ]]; then
    echo -e "${GREEN}PASS (Request correctly rejected)${NC}"
else
    echo -e "${RED}FAIL: $resp_3_2${NC}"
fi

# ─────────────────────────────────────────────────────────────────
# 4. ALLOCATION EDGE CASES
# ─────────────────────────────────────────────────────────────────
echo -e "\n--- 4. Allocation Edge Cases ---"

# Retrieve an asset to allocate
ASSET_ID=$(curl -s -X GET "$BASE_URL/assets" -H "Authorization: Bearer $ADMIN_TOKEN" | grep -o '"id":[0-9]*' | head -n 1 | grep -o '[0-9]*')

# Check double allocation (Conflict 409)
if [ ! -z "$ASSET_ID" ]; then
    # Make sure it's allocated to someone first
    curl -s -X POST "$BASE_URL/allocations" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"asset_id\": $ASSET_ID, \"holder_type\": \"Employee\", \"holder_id\": 1}" > /dev/null

    echo -n "Test 4.1: Double allocate same asset (Expect 409 Conflict with holder details) -> "
    resp_4_1=$(curl -s -X POST "$BASE_URL/allocations" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"asset_id\": $ASSET_ID, \"holder_type\": \"Employee\", \"holder_id\": 2}" \
      -w " | STATUS: %{http_code}")
    if [[ "$resp_4_1" == *"STATUS: 409"* && "$resp_4_1" == *"holder_name"* ]]; then
        echo -e "${GREEN}PASS (409 Conflict with current holder info)${NC}"
    else
        echo -e "${RED}FAIL: $resp_4_1${NC}"
    fi
else
    echo -e "${RED}[WARN] No assets available to test allocation conflict.${NC}"
fi

echo "=========================================================="
echo "                    Tests Completed                       "
echo "=========================================================="
