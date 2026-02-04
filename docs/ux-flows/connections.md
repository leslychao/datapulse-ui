# UX Flow — Connections (Data Sources)

## Purpose
Provide a clear, product-grade flow for creating, validating, and monitoring data connections.

## Screens
1) **Connections List**
   - Columns: Marketplace, Name, Status, Last sync, Freshness, Actions.
   - Status badge: Connected / Syncing / Error / Disabled.
   - Primary actions: **Run sync**, **View details**.
   - Secondary actions: Edit, Disable, Delete.
   - Empty state: explains why empty + CTA “Create connection”.

2) **Create Connection Wizard**
   - Step 1: Select marketplace (WB / Ozon).
   - Step 2: Enter credentials (with help text “where to get keys”).
   - Step 3: Validate credentials (human-readable result).
   - Step 4: Initial sync progress.
   - Step 5: Success state + next steps.

3) **Connection Details**
   - Diagnostics: what’s wrong + reasons + CTA (Retry / Re-check credentials).
   - Technical details hidden under “Details”.

## UX Rules
- Errors are actionable (what happened + what to do).
- Retry/revalidate does not require a full page reload.
- Connection cards and rows always show last sync + freshness.

