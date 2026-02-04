# DataPulse UX Audit

## Routes / Pages / Modules

| Route | Page/module | Business meaning | Primary user task |
| --- | --- | --- | --- |
| `/` | Login | Entry point for authentication. | Sign in to access the product. |
| `/login` | Login | Explicit login route. | Sign in to access the product. |
| `/workspaces` | Workspace Switcher | Workspace selection/overview. | Pick or create a workspace to enter. |
| `/workspaces/create` | Create Workspace | Workspace creation flow. | Create a workspace and continue setup. |
| `/workspaces/:accountId` | Workspace Switcher | Workspace deep link. | Resolve access and land into a workspace. |
| `/app/onboarding` | Onboarding | Initial onboarding wizard. | Complete setup steps after signup. |
| `/app/:accountId/overview` | Analytics Overview | Core analytics summary. | See top KPIs and overview. |
| `/app/:accountId/finance/pnl` | Finance PnL | Profit & Loss analytics. | Review PnL metrics. |
| `/app/:accountId/finance/unit-economics` | Unit Economics | Unit economics analytics. | Review per-unit profitability. |
| `/app/:accountId/operations/inventory-doc` | Inventory | Inventory operations metrics. | Monitor inventory status. |
| `/app/:accountId/operations/returns-buyout` | Returns & Buyout | Returns analytics. | Monitor returns performance. |
| `/app/:accountId/operations/sales-monitoring` | Sales Monitoring | Sales monitoring analytics. | Track sales velocity. |
| `/app/:accountId/marketing/ads` | Marketing Ads | Ads/marketing metrics. | Track ad performance. |
| `/app/:accountId/monitoring` | Monitoring | Data freshness and sync status. | Diagnose sync issues and retry. |
| `/app/:accountId/connections` | Connections | Data source connections management. | View/create/manage data connections. |
| `/app/:accountId/users` | Users & Access | Users & access management. | Invite/manage users and roles. |
| `/app/:accountId/workspace-settings` | Workspace Settings | Workspace configuration. | Rename, archive, and manage access. |

## Duplicate/Overlapping UX (One Meaning → One Screen)

| What duplicates | Why it is the same meaning | Canonical target |
| --- | --- | --- |
| Analytics summary screens | Multiple entry points for overview metrics. | Single canonical “Analytics Overview” screen. |
| Workspace selection screens | Duplicate workspace selection flows. | Single canonical “Workspace Switcher / My Workspaces”. |
| Sync status widgets | Fragmented sync indicators. | Dedicated “Monitoring” screen as single source of truth. |

## UX Defects

### Navigation / Context
- Workspace context must be visible on every screen.
- Users & Connections should be first-class navigation items.
- Monitoring should unify sync status and errors.

### Forms / Tables / States
- All screens must use the shared UI kit (forms, tables, states).
- Loading/error/empty states must be consistent.

### Duplicate Entities / Flows
- Eliminate duplicate workspaces/overview pages.
- Use one canonical Connections list and one Users & Access screen.

### Inconsistent Copy / Labels
- “Workspace / Connection / Sync” terminology must be consistent.

### Data Sync Status Clarity
- Connection-level status must show state, last sync, and freshness.
- Monitoring must describe what’s wrong and what to do next.

