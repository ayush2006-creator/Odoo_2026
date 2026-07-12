# AssetFlow API - Frontend Integration Guide

Welcome to the AssetFlow API developer guide! This document outlines all available endpoints, required request bodies, and sample response structures for integration with the frontend application.

## Table of Contents
1. [General Configuration](#general-configuration)
2. [Authentication Module](#1-authentication)
3. [Organization & Setup](#2-organization--setup)
4. [Asset Registry](#3-asset-registry)
5. [Allocations & Transfers](#4-allocations--transfers)
6. [Resource Booking](#5-resource-booking)
7. [Maintenance Ticketing](#6-maintenance-ticketing)
8. [Audits Module](#7-audits-module)
9. [Dashboard & Reports](#8-dashboard--reports)
10. [Notifications & Logs](#9-notifications--logs)

---

## General Configuration
- **Base URL**: `http://127.0.0.1:8001` (local) or your Render deployment URL.
- **Headers**: All protected endpoints require a Bearer token in the `Authorization` header:
  ```http
  Authorization: Bearer <your_access_token>
  ```
- **Error Codes**:
  - `400 Bad Request`: Validation failure or bad input logic.
  - `401 Unauthorized`: Missing or invalid token.
  - `403 Forbidden`: Insufficient role permissions (Admin, AssetManager, etc.).
  - `409 Conflict`: Business validation error (e.g. asset already allocated, overlapping bookings).

---

## 1. Authentication
Endpoints for signing up, logging in, logging out, session check, and password recovery.

### POST `/auth/signup`
- **Access**: Public. Default role created is **`Employee`**.
- **Request Body**:
  ```json
  {
    "name": "Alex Carter",
    "email": "alex@company.com",
    "password": "securepassword123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": 5,
    "name": "Alex Carter",
    "email": "alex@company.com",
    "role": "Employee",
    "status": "Active",
    "department_id": null,
    "created_at": "2026-07-12T11:00:00",
    "updated_at": "2026-07-12T11:00:00"
  }
  ```

### POST `/auth/login`
- **Access**: Public. Returns JWT access token.
- **Request Body**:
  ```json
  {
    "email": "alex@company.com",
    "password": "securepassword123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer"
  }
  ```

### GET `/auth/session`
- **Access**: Logged-in Users. Validates the current token.
- **Response (200 OK)**:
  ```json
  {
    "id": 5,
    "name": "Alex Carter",
    "email": "alex@company.com",
    "role": "Employee",
    "status": "Active",
    "department_id": null,
    "created_at": "2026-07-12T11:00:00",
    "updated_at": "2026-07-12T11:00:00"
  }
  ```

### POST `/auth/forgot-password`
- **Request Body**:
  ```json
  {
    "email": "alex@company.com"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Password reset token generated",
    "reset_token": "eyJhbGciOiJIUzI1NiJ9..."
  }
  ```

### POST `/auth/reset-password`
- **Request Body**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "new_password": "newsecurepassword456"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Password reset successfully"
  }
  ```

### POST `/auth/logout`
- **Response (200 OK)**:
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

---

## 2. Organization & Setup

### GET `/employees`
- **Access**: Logged-in Users.
- **Query Params (Optional)**: `department_id`, `role`, `status`.
- **Response (200 OK)**:
  ```json
  [
    {
      "id": 5,
      "name": "Alex Carter",
      "email": "alex@company.com",
      "role": "Employee",
      "status": "Active",
      "department_id": 2
    }
  ]
  ```

### PATCH `/employees/:id`
- **Access**: **Admin Only**. Deactivate employees or update properties.
- **Request Body** (All fields optional):
  ```json
  {
    "name": "Alex Carter (Updated)",
    "department_id": 1,
    "status": "Inactive"
  }
  ```
- **Response (200 OK)**: Returns updated Employee JSON.

### PATCH `/employees/:id/role`
- **Access**: **Admin Only**. Promoting employee roles.
- **Request Body**:
  ```json
  {
    "role": "AssetManager" 
  }
  ```
  *(Valid roles: `Employee`, `DepartmentHead`, `AssetManager`, `Admin`)*
- **Response (200 OK)**: Returns updated Employee JSON.

### CRUD Departments
- **GET `/departments`**: Fetch all departments.
- **POST `/departments`** (Admin only): Create department.
  - Request: `{"name": "Engineering", "parent_department_id": null, "department_head_id": null}`
- **PATCH `/departments/:id`** (Admin only): Update department.
- **DELETE `/departments/:id`** (Admin only): Soft-deactivate department (sets `status` to `Inactive`).

### CRUD Asset Categories
- **GET `/asset-categories`**: Fetch all categories.
- **POST `/asset-categories`** (Admin only): Create category.
  - Request:
    ```json
    {
      "name": "Electronics",
      "custom_fields": {
        "warranty_months": "integer",
        "processor": "string"
      }
    }
    ```
- **DELETE `/asset-categories/:id`** (Admin only): Delete category.

---

## 3. Asset Registry

### GET `/assets`
- **Access**: Logged-in Users.
- **Query Params (Optional)**: `tag`, `serial`, `qr`, `category_id`, `status`, `department_id`, `location`.
- **Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "asset_tag": "AF-0001",
      "name": "MacBook Pro M3",
      "category_id": 1,
      "serial_number": "SN-XYZ-123",
      "qr_code": "QR-CODE-STR",
      "acquisition_date": "2026-07-01",
      "acquisition_cost": 2499.00,
      "condition": "New",
      "location": "Building A",
      "photos_docs": ["http://link.com/img.png"],
      "custom_values": {
        "warranty_months": 24
      },
      "is_bookable": false,
      "status": "Available",
      "current_holder_type": "None",
      "current_holder_id": null
    }
  ]
  ```

### POST `/assets`
- **Access**: **AssetManager / Admin**. Registers an asset. Tag (e.g. `AF-0001`) is auto-generated sequentially.
- **Request Body**:
  ```json
  {
    "name": "Office Standing Desk",
    "category_id": 2,
    "serial_number": "SN-DESK-99",
    "condition": "New",
    "location": "Building B",
    "is_bookable": false,
    "custom_values": {}
  }
  ```

### POST `/assets/:id/transition`
- **Access**: **AssetManager / Admin**. Manual state overrides (e.g. moving asset to maintenance, lost, retired).
- **Request Body**:
  ```json
  {
    "next_status": "Under Maintenance"
  }
  ```
  *(Valid values: `Available`, `Allocated`, `Reserved`, `Under Maintenance`, `Lost`, `Retired`, `Disposed`)*

---

## 4. Allocations & Transfers

### POST `/allocations`
- **Access**: **AssetManager / Admin**. Allocate asset to Employee or Department.
- **Request Body**:
  ```json
  {
    "asset_id": 1,
    "holder_type": "Employee",
    "holder_id": 3,
    "expected_return_date": "2026-08-12"
  }
  ```
- **Conflict Handling (409)**: If the asset is already allocated, the server blocks it and returns **`409 Conflict`** with current holder info:
  ```json
  {
    "detail": {
      "message": "Asset is already allocated",
      "holder_type": "Employee",
      "holder_id": 2,
      "holder_name": "John Doe",
      "asset_tag": "AF-0001"
    }
  }
  ```
  *When receiving a `409`, the frontend should prompt: **"Currently held by John Doe. Would you like to raise a Transfer Request?"***

### POST `/allocations/:id/return`
- **Access**: **AssetManager / Admin**. Return allocated asset. Reverts asset status to `Available`.
- **Request Body**:
  ```json
  {
    "condition_check_in_notes": "Returned in perfect condition."
  }
  ```

### POST `/transfers`
- **Access**: Logged-in Users. Initiate transfer of asset.
- **Request Body**:
  ```json
  {
    "asset_id": 1,
    "to_holder_id": 4
  }
  ```

### PATCH `/transfers/:id/approve`
- **Access**: **DepartmentHead / AssetManager / Admin**. Performs automatic re-allocation, closing the old allocation and creating a new one.

---

## 5. Resource Booking
For bookable assets (e.g., meeting rooms, shared cars, projectors).

### POST `/bookings`
- **Access**: Logged-in Users.
- **Request Body**:
  ```json
  {
    "resource_id": 2,
    "start_time": "2026-08-01T10:00:00",
    "end_time": "2026-08-01T12:00:00",
    "purpose": "Sprint Review"
  }
  ```
- **Double-booking Check (409)**: If another booking overlaps, the server blocks the booking and returns **`409 Conflict`**.
- **PATCH `/bookings/:id/cancel`**: Cancel an upcoming booking.
- **PATCH `/bookings/:id/reschedule`**: Update booking times (validates overlaps first).

---

## 6. Maintenance Ticketing

### POST `/maintenance-requests`
- **Access**: Any Employee.
- **Request Body**:
  ```json
  {
    "asset_id": 3,
    "issue_description": "Screen flickering intermittently",
    "priority": "High",
    "photo": "http://docs.com/screen.png"
  }
  ```

### Workflow Actions (AssetManager Only)
- **PATCH `/maintenance-requests/:id/approve`**: Flips asset status to `Under Maintenance`.
- **PATCH `/maintenance-requests/:id/assign-technician`**: `{"technician_id": 2}`.
- **PATCH `/maintenance-requests/:id/start`**: Tech moves ticket to `InProgress`.
- **PATCH `/maintenance-requests/:id/resolve`**: `{"resolution_notes": "Replaced motherboard"}`. Reverts asset to `Available`.

---

## 7. Audits Module

### POST `/audit-cycles`
- **Access**: **Admin Only**. Creates a cycle and **automatically populates audit items** for all assets matching the location/department.
- **Request Body**:
  ```json
  {
    "name": "Q3 Office Audit",
    "scope_type": "Location",
    "scope_value": "Building A",
    "date_range_start": "2026-07-01",
    "date_range_end": "2026-07-31"
  }
  ```

### Audit Cycle Workflows
- **POST `/audit-cycles/:id/auditors`**: `{"auditor_ids": [3, 4]}`. Assigns auditors.
- **GET `/audit-cycles/:id/items`**: Fetch list of items to audit.
- **PATCH `/audit-cycles/:id/items/:assetId`**: Auditor verifies item.
  - Request: `{"result": "Missing", "notes": "Not in desk"}` (Results: `Verified`, `Missing`, `Damaged`).
  - *If marked Missing/Damaged, it automatically generates a Discrepancy Report.*
- **PATCH `/audit-cycles/:id/close`**: Locks cycle. Assets marked `Missing` auto-transition status to `Lost`.

---

## 8. Dashboard & Reports

### GET `/dashboard/kpis`
- Returns counters for all assets and active states.
- **Response (200 OK)**:
  ```json
  {
    "total_assets": 24,
    "assets_available": 21,
    "assets_allocated": 1,
    "assets_under_maintenance": 2,
    "assets_reserved": 0,
    "maintenance_today": 3,
    "active_bookings": 0,
    "pending_transfers": 2,
    "upcoming_returns": 0
  }
  ```

### GET `/dashboard/overdue`
- Returns list of allocations that have exceeded the expected return date.

### GET `/reports/utilization`
- Returns list of **`most_used_assets`** and **`idle_assets`**.

### GET `/reports/export`
- CSV export for reports. Query params: `?type=utilization&format=csv` (returns a downloadable CSV file stream).

---

## 9. Notifications & Logs

### GET `/notifications`
- Fetch user-specific notifications.
- **PATCH `/notifications/:id/read`**: Mark read.

### GET `/activity-logs`
- **Access**: DepartmentHead/AssetManager/Admin. Audit log of who performed what action.
