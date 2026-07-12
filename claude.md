# CLAUDE.md — AssetFlow Frontend

This file gives Claude Code the context it needs to work effectively in this repo. Read it before making changes.

## Project Overview

AssetFlow is an Enterprise Asset & Resource Management System (ERP module) for tracking physical assets, allocations, shared-resource bookings, maintenance workflows, and audit cycles across any organization (offices, hospitals, schools, factories).

Full product spec: see `/docs/AssetFlow_problem_statement.pdf` and `/docs/AssetFlow_Models_and_Endpoints.md` (data models + REST API contract — treat this as the source of truth for request/response shapes).

## Tech Stack

- **Framework**: React 18 + Vite (JavaScript, not TypeScript)
- **Styling**: Tailwind CSS
- **UI components**: shadcn/ui (Radix-based, copied into `src/components/ui`)
- **Animation**: Motion (`motion/react`, the successor to Framer Motion)
- **Routing**: React Router
- **State/data fetching**: (fill in once decided — e.g. TanStack Query for server state, Zustand/Context for local UI state)
- **Forms**: React Hook Form + Zod-lite validation (or whatever's installed — check `package.json` before assuming)

Always check `package.json` for the actual installed versions before adding a new dependency — don't assume a library is available.

## Folder Structure (target)

```
src/
  api/              # fetch wrappers per resource (assets.js, bookings.js, maintenance.js, ...)
  components/
    ui/             # shadcn primitives — do not hand-edit generated files, use `npx shadcn add`
    layout/         # Sidebar, Topbar, PageShell, KPI cards
    shared/         # cross-screen reusable pieces (StatusBadge, AssetCard, DataTable)
  features/
    auth/
    dashboard/
    org-setup/       # departments, categories, employee directory (3 tabs)
    assets/          # registration + directory
    allocations/     # allocation + transfer
    bookings/         # resource booking + calendar
    maintenance/
    audits/
    reports/
    notifications/
  hooks/
  lib/               # utils, constants, role-permission helpers
  routes/            # route definitions / route-level guards
  App.jsx
  main.jsx
```

Each item under `features/` should be self-contained: its own components, hooks, and API calls. Shared primitives go in `components/shared` or `components/ui`, not duplicated per feature.

## Design & UI Conventions

- Use shadcn/ui components as the base for all forms, dialogs, tables, tabs, and dropdowns. Don't hand-roll a modal/select/table when a shadcn equivalent exists.
- Tailwind only — no inline `style={{}}` unless truly dynamic (e.g. computed widths for a calendar grid).
- Use Motion for meaningful transitions only: page/section entrance, drawer/dialog open-close, list reordering. Don't animate everything — a status badge changing color doesn't need a spring.
- Keep a consistent status-color mapping across the app (define once, e.g. in `lib/statusColors.js`):
  - Available → green, Allocated → blue, Reserved → amber, Under Maintenance → orange, Lost → red, Retired/Disposed → gray
  - Booking: Upcoming → blue, Ongoing → green, Completed → gray, Cancelled → red
  - Maintenance: Pending → amber, Approved → blue, Rejected → red, In Progress → orange, Resolved → green
- Dashboard KPI cards, tables, and calendars are the visual backbone of this app — prioritize clean data density over decoration.

## Role-Based Behavior

Four roles: **Admin, Asset Manager, Department Head, Employee**. Role comes from the authenticated user, never from client-side state the user can set. UI must:
- Hide/disable actions not permitted for the current role (e.g. only Admin sees Org Setup; only Asset Manager/Dept Head see approve buttons).
- Still assume the backend enforces permissions independently — the frontend hides buttons for UX, it is not the security boundary.
- Centralize role checks in a single helper (e.g. `hooks/usePermissions.js`) rather than scattering `role === 'Admin'` checks through components.

## API Integration

- All endpoints and payload shapes are defined in `AssetFlow_Models_and_Endpoints.md` — check it before guessing a field name or endpoint path.
- Key business rules the frontend must handle gracefully (not just the backend):
  - **Allocation conflict (409)**: show "currently held by X" and offer a Transfer Request action instead of a generic error.
  - **Booking overlap (409)**: show the conflicting time slot and suggest the next available one where possible.
  - Both of these are expected, everyday responses — not exceptional errors — so design the UI states for them explicitly rather than falling back to a toast.
- Centralize fetch logic per resource in `src/api/`, not inline in components.

## Conventions

- Functional components, hooks only, no class components.
- Co-locate a feature's hooks with its components inside `features/<name>/`.
- Name files by what they export: `AssetTable.jsx`, `useAssetAllocation.js`.
- Keep components under ~200 lines; split subcomponents out once a screen (e.g. Asset Registration, Audit Cycle) grows complex.
- Prefer composition over prop-drilling for deeply nested UI (tabs within Org Setup, multi-step maintenance workflow).

## What Not to Do

- Don't self-assign or hardcode a role in signup flow — signup always creates a plain Employee.
- Don't invent new asset/booking/maintenance statuses beyond those listed in the spec.
- Don't bypass shadcn/ui for standard controls just to add custom animation — wrap the shadcn component with Motion instead.
- Don't add new dependencies without checking `package.json` first.

## Commands

```
npm run dev        # start Vite dev server
npm run build       # production build
npm run lint         # lint
```

(Update this section once test tooling is added.)