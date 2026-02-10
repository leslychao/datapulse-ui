export enum AccountMemberStatus {
  Active = "ACTIVE",
  Invited = "INVITED",
  Blocked = "BLOCKED",
  Removed = "REMOVED",
  Inactive = "INACTIVE"
}

export enum AccountMemberRole {
  Owner = "OWNER",
  Admin = "ADMIN",
  Operator = "OPERATOR",
  Viewer = "VIEWER"
}

export interface AccountMemberResponse {
  id: number;
  accountId: number;
  userId: number;

  email: string | null;
  username: string | null;
  fullName: string | null;

  recentlyActive: boolean;
  lastActivityAt: string | null;

  role: AccountMemberRole;
  status: AccountMemberStatus;

  createdAt: string;
  updatedAt: string;
}

export type AccountMember = AccountMemberResponse;

export interface AccountMemberCreateRequest {
  email?: string | null;
  userId?: number | null;
  message?: string | null;
  role: AccountMemberRole;
  status: AccountMemberStatus;
}

export interface AccountMemberUpdateRequest {
  role: AccountMemberRole;
  status: AccountMemberStatus;
}
