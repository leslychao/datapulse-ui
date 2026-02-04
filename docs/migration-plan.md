# DataPulse UX Migration Plan

## Phase 1 — Foundations (Docs + IA + UI Kit)
1) Lock terminology: Workspace / Connection / Sync.
2) Define global IA & navigation (Workspace, Connections, Data & Dashboards, Monitoring, Users & Access, Settings).
3) Build shared UI kit under `shared/ui`:
   - PageLayout, PageHeader
   - Breadcrumbs/LocationHeader
   - Button (variants/sizes/loading/icon)
   - Toolbar (filters/actions slots)
   - FormField + inputs
   - Table + TableToolbar + Pagination
   - EmptyState, ErrorState, LoadingState/Skeleton
   - Modal, ConfirmDialog
   - Toast/Notifications

## Phase 2 — Screen Consolidation (Remove Duplicates)
1) Merge Dashboard Summary + Overview → single “Analytics Overview”.
2) Merge Workspaces + Account Select → single “Workspace Switcher / My Workspaces”.
3) Ensure Monitoring is the single source of truth for sync health.

## Phase 3 — Core Product Flows (Enterprise UX)
1) **Workspace lifecycle**
   - Create → next step panel (Create Connection / Run first Sync / Open dashboards).
   - Switcher visible on every page.
   - Archive/Delete with explicit confirmation and impact list.
2) **Connections lifecycle**
   - Product-grade wizard: Select marketplace → Credentials → Validate → Sync scope → Frequency → Finish.
   - Connection list with status badge, last sync, freshness, actions.
   - Diagnostics view: human explanation + CTA; technical details under “Details”.
3) **Users & Roles**
   - Users & Access page with filters by status, search, and inline role changes.
   - Invite flow with role + optional message + confirmation.
   - Role-aware UI and safeguards (no last Owner removal, etc.).

## Phase 4 — Monitoring
- Build unified Monitoring page with connection freshness, last sync, incidents, and quick actions.

## Phase 5 — Cleanup & Polish
- Remove dead routes and legacy redirects.
- Normalize copy and empty states across all pages.
- Validate UX parity across all user roles.

---

## Checklist: How to Build New Screens (No Duplicates)
- [ ] Confirm the business meaning does not exist elsewhere.
- [ ] If it overlaps, merge with the canonical screen instead of adding a new one.
- [ ] Use UI kit components only (no local buttons/inputs/tables).
- [ ] Page uses PageLayout + PageHeader with a single primary action.
- [ ] Workspace context is visible on the page.
- [ ] Provide empty/loading/error states with standardized components.
- [ ] Ensure role-aware behavior (hide/disable unauthorized actions).
- [ ] Add clear “what’s next” guidance for the user.

