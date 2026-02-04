# UX Flow — Users & Access

## Purpose
Make access management a first-class product feature with safe, role-aware actions.

## Screen
**Users & Access**
- Header: title + primary CTA “Invite user”.
- Filters: Active / Invited / Blocked.
- Search by name/email.
- Table: User, Role, Status, Last active, Actions.

## Invite Flow
1) Enter email
2) Select role
3) Optional message
4) Send
5) Confirmation state: “Invite sent” + actions (Resend / Cancel)

## Actions & Guardrails
- Change role: inline dropdown, confirmation if escalating to Admin/Owner.
- Block / Unblock.
- Remove from workspace.
- **Guardrails**:
  - Cannot remove the last Owner.
  - Cannot demote self without explicit confirmation.
  - Disabled actions explain “why”.

## Status Model
- Active
- Invited (pending)
- Blocked
- Removed (historical)

