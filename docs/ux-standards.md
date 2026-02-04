# DataPulse UX Standards (Product-Grade)

## Global Terminology (Single Source of Truth)
- **Workspace** = Account/Cabinet. Use “Workspace” everywhere.
- **Connection** = Data source connection. Use “Connection” everywhere.
- **Sync** = Data synchronization. Use “Sync” everywhere.

## IA & Navigation
- Global sections (stable):
  1) Workspace
  2) Connections
  3) Data & Dashboards
  4) Monitoring
  5) Users & Access
  6) Settings
- Workspace context is always visible (header or sidebar): current workspace name + switcher.
- If no workspace is selected: redirect to Workspace selection/creation flow (no empty pages).

## Page Structure (Layout)
- **PageLayout** wraps every page.
- **PageHeader** contains:
  - Title + short subtitle (what this page is for).
  - Primary action (single, right-aligned).
  - Secondary actions (inline buttons or menu).
- **Breadcrumbs / Location header** (single pattern) for navigation context.

## Actions Hierarchy
- **Primary action**: one main CTA per page.
- **Secondary actions**: de-emphasized buttons.
- **Destructive actions**: always in menus + confirmation dialog.

## Tables / Filters / Pagination
- Tables use the shared `Table` component only.
- Filters live in `TableToolbar` / `Toolbar` with clear labels and reset.
- Pagination is always visible for multi-page datasets.
- Empty tables use `EmptyState` with reason + next step CTA.

## Forms & Validation
- Inputs only via shared `FormField` + standardized inputs.
- Inline validation with clear error text.
- Required fields are explicitly marked.
- Submit buttons show loading state and disabled state.

## States (Loading / Empty / Error)
- `LoadingState` / `Skeleton` for all loading screens.
- `EmptyState` always explains “why empty” + “what to do next” + CTA.
- `ErrorState` includes human message + retry action. Technical details are hidden under “Details”.

## Confirmations (Dangerous Actions)
- Use `ConfirmDialog` for delete/archive/disable.
- Confirm copy must state consequences and list impacted items if known.
- If delete is not allowed, provide “Archive” with clear explanation.

## Role-Aware UI
- UI must hide or disable actions the user cannot perform.
- Disabled actions show a tooltip or helper text explaining lack of permission.
- Role changes require confirmation when escalating to Admin/Owner.
- Prevent destructive “self harm”:
  - Cannot remove the last Owner.
  - Cannot demote self without explicit confirmation.
  - Cannot delete self without clear outcome.

## B2B Tone of Voice
- Clear, concise, and action-oriented.
- Use “You can…” and “Next step” to guide.
- Avoid jargon and internal system terms in UI.

