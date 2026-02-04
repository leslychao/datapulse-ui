# UX Flow — Workspaces (Accounts)

## Purpose
Provide a predictable lifecycle for Workspaces: create, switch, manage, archive/delete with clear consequences and next steps.

## Screens
1) **Workspace Switcher (My Workspaces)**
   - Primary CTA: **Create workspace**.
   - Table/list with workspace name, status, last activity, and quick actions.
   - Inline search.
   - Selecting a workspace sets it as active and takes the user to Analytics Overview.

2) **Create Workspace**
   - Fields: Name (required), Description (optional).
   - Submit → creates workspace → route to workspace settings + “What’s next” panel.

3) **Workspace Settings**
   - Workspace details (name, description, status).
   - Manage users (shortcut to Users & Access).
   - Manage connections (shortcut to Connections).

## Lifecycle & Guardrails
- Workspace context is always visible via the workspace header.
- If no workspace is selected, user is directed to Workspace Switcher.
- **Delete/Archive**:
  - If this is the last workspace → deletion is blocked, show explanation.
  - Confirmation dialog must list impact (connections, users).
  - If deletion is not allowed → show “Archive” with explanation.

## What’s Next Panel (post-create)
- “Connect a data source” (primary)
- “Run first sync”
- “Open dashboards”

