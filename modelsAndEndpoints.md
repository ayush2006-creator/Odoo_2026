# AssetFlow — Data Models & API Endpoints

## 1. Data Models

### User (Employee)
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | string | |
| email | string | unique |
| passwordHash | string | |
| departmentId | FK → Department | |
| role | enum | Employee, DepartmentHead, AssetManager, Admin — set only via Org Setup, never at signup |
| status | enum | Active, Inactive |
| createdAt / updatedAt | timestamp | |

### Department
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | string | |
| parentDepartmentId | FK → Department (nullable) | hierarchy |
| departmentHeadId | FK → User (nullable) | |
| status | enum | Active, Inactive |

### AssetCategory
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | string | e.g. Electronics, Furniture, Vehicles |
| customFields | JSON | schema for category-specific fields (e.g. warranty period) |

### Asset
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| assetTag | string | auto-generated, e.g. AF-0001 |
| name | string | |
| categoryId | FK → AssetCategory | |
| serialNumber | string | |
| qrCode | string | |
| acquisitionDate | date | |
| acquisitionCost | decimal | reporting only, not linked to accounting |
| condition | enum/string | New, Good, Fair, Poor, Damaged |
| location | string | |
| photos / documents | array of file refs | |
| isBookable | boolean | shared/bookable flag |
| status | enum | Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed |
| currentHolderType | enum | Employee, Department, None |
| currentHolderId | UUID (nullable) | |
| createdAt / updatedAt | timestamp | |

### AssetAllocation
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| assetId | FK → Asset | |
| holderType | enum | Employee, Department |
| holderId | UUID | |
| allocatedDate | date | |
| expectedReturnDate | date (nullable) | |
| actualReturnDate | date (nullable) | |
| status | enum | Active, Returned, Overdue |
| conditionCheckInNotes | string | on return |
| createdBy | FK → User | |

### TransferRequest
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| assetId | FK → Asset | |
| fromHolderId / toHolderId | UUID | |
| requestedBy | FK → User | |
| status | enum | Requested, Approved, Rejected, Completed |
| approvedBy | FK → User (nullable) | Asset Manager / Dept Head |
| createdAt / resolvedAt | timestamp | |

### Booking
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| resourceId | FK → Asset | must be isBookable=true |
| bookedBy | FK → User | |
| startTime / endTime | datetime | |
| purpose | string | |
| status | enum | Upcoming, Ongoing, Completed, Cancelled |
| createdAt | timestamp | |

### MaintenanceRequest
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| assetId | FK → Asset | |
| raisedBy | FK → User | |
| issueDescription | string | |
| priority | enum | Low, Medium, High, Critical |
| photo | file ref | |
| status | enum | Pending, Approved, Rejected, TechnicianAssigned, InProgress, Resolved |
| approvedBy | FK → User (nullable) | Asset Manager |
| technicianId | FK → User (nullable) | |
| resolutionNotes | string | |
| createdAt / resolvedAt | timestamp | |

### AuditCycle
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | string | |
| scopeType | enum | Department, Location |
| scopeValue | string | |
| dateRangeStart / dateRangeEnd | date | |
| status | enum | Open, Closed |
| createdBy | FK → User | |

### AuditorAssignment
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| auditCycleId | FK → AuditCycle | |
| auditorId | FK → User | |

### AuditItem
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| auditCycleId | FK → AuditCycle | |
| assetId | FK → Asset | |
| verifiedBy | FK → User | |
| result | enum | Verified, Missing, Damaged |
| notes | string | |
| verifiedAt | timestamp | |

### DiscrepancyReport
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| auditCycleId | FK → AuditCycle | |
| assetId | FK → Asset | |
| discrepancyType | enum | Missing, Damaged |
| resolutionStatus | enum | Open, Resolved |
| resolvedBy | FK → User (nullable) | |

### Notification
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| userId | FK → User | |
| type | enum | AssetAssigned, MaintenanceApproved, MaintenanceRejected, BookingConfirmed, BookingCancelled, BookingReminder, TransferApproved, OverdueReturn, AuditDiscrepancy |
| message | string | |
| relatedEntityType / relatedEntityId | string / UUID | |
| read | boolean | |
| createdAt | timestamp | |

### ActivityLog
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| userId | FK → User | actor |
| action | string | e.g. "Approved Transfer" |
| entityType / entityId | string / UUID | |
| details | JSON | before/after or metadata |
| timestamp | timestamp | |

---

## 2. API Endpoints

### Auth
```
POST   /auth/signup                 // Employee account only, no role selection
POST   /auth/login
POST   /auth/logout
POST   /auth/forgot-password
POST   /auth/reset-password
GET    /auth/session                // validate current session
```

### Employees (Org Setup — Tab C)
```
GET    /employees                   // filter: department, role, status
GET    /employees/:id
PATCH  /employees/:id               // update/deactivate (Admin)
PATCH  /employees/:id/role          // promote to DepartmentHead/AssetManager (Admin only)
```

### Departments (Org Setup — Tab A)
```
GET    /departments
POST   /departments
GET    /departments/:id
PATCH  /departments/:id
DELETE /departments/:id             // deactivate, not hard delete
```

### Asset Categories (Org Setup — Tab B)
```
GET    /asset-categories
POST   /asset-categories
PATCH  /asset-categories/:id
DELETE /asset-categories/:id
```

### Assets
```
GET    /assets                      // filter: tag, serial, qr, category, status, department, location
POST   /assets                      // register, auto-generates assetTag, status=Available
GET    /assets/:id
PATCH  /assets/:id
GET    /assets/:id/allocation-history
GET    /assets/:id/maintenance-history
POST   /assets/:id/transition       // internal state transition (e.g. Available <-> Under Maintenance)
```

### Allocations & Transfers
```
POST   /allocations                 // allocate asset; 409 if already allocated
GET    /allocations                 // filter: employee, department, status
GET    /allocations/:id
POST   /allocations/:id/return      // capture condition notes, reverts asset to Available
GET    /allocations/overdue

POST   /transfers                   // create transfer request (shown after allocation conflict)
GET    /transfers
GET    /transfers/:id
PATCH  /transfers/:id/approve       // Asset Manager / Dept Head
PATCH  /transfers/:id/reject
```

### Resource Booking
```
GET    /assets/:id/bookings         // calendar view for a resource
POST   /bookings                    // validates overlap, 409 on conflict
GET    /bookings                    // filter: user, resource, status, date range
GET    /bookings/:id
PATCH  /bookings/:id/cancel
PATCH  /bookings/:id/reschedule
GET    /bookings/upcoming           // for reminder notifications
```

### Maintenance
```
POST   /maintenance-requests
GET    /maintenance-requests        // filter: asset, status, priority
GET    /maintenance-requests/:id
PATCH  /maintenance-requests/:id/approve     // Asset Manager, asset -> Under Maintenance
PATCH  /maintenance-requests/:id/reject
PATCH  /maintenance-requests/:id/assign-technician
PATCH  /maintenance-requests/:id/start        // -> In Progress
PATCH  /maintenance-requests/:id/resolve      // -> Resolved, asset -> Available
```

### Audit Cycles
```
POST   /audit-cycles
GET    /audit-cycles
GET    /audit-cycles/:id
POST   /audit-cycles/:id/auditors             // assign auditor(s)
GET    /audit-cycles/:id/items
PATCH  /audit-cycles/:id/items/:assetId        // auditor marks Verified/Missing/Damaged
GET    /audit-cycles/:id/discrepancies         // auto-generated report
PATCH  /audit-cycles/:id/close                 // locks cycle, updates asset statuses (e.g. Lost)
```

### Reports & Analytics
```
GET    /reports/utilization                    // most-used vs idle assets
GET    /reports/maintenance-frequency
GET    /reports/due-for-maintenance-or-retirement
GET    /reports/department-allocation-summary
GET    /reports/booking-heatmap
GET    /reports/export?type=<report>&format=csv|pdf
```

### Dashboard
```
GET    /dashboard/kpis              // Assets Available, Allocated, Maintenance Today, Active Bookings, Pending Transfers, Upcoming Returns
GET    /dashboard/overdue           // overdue returns, separated from upcoming
```

### Notifications & Activity Logs
```
GET    /notifications                // filter: user, type, read/unread
PATCH  /notifications/:id/read
GET    /activity-logs                // filter: user, entity, date range
```

---

## 3. Notes on Cross-Cutting Rules
- **Role assignment**: only `PATCH /employees/:id/role` (Admin-only) can change a user's role — never exposed at signup.
- **Allocation conflict**: `POST /allocations` must check `Asset.status` and `currentHolderId` before creating; return 409 with current holder info so the UI can offer the Transfer Request flow.
- **Booking overlap**: `POST /bookings` must check for any existing booking on the same `resourceId` where `startTime < existing.endTime AND endTime > existing.startTime`.
- **Status transitions** should be enforced server-side (a state machine per asset), not left to the client, since so many workflows (maintenance, allocation, audit) mutate `Asset.status`.
- Most write endpoints should also emit an `ActivityLog` entry and, where relevant, a `Notification`.