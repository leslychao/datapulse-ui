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
  email?: string | null;
  fullName?: string | null;
  lastActiveAt?: string | null;
  status: AccountMemberStatus;
  role: AccountMemberRole;
  createdAt: string;
  updatedAt: string;
}

export type AccountMember = AccountMemberResponse;

export interface AccountMemberCreateRequest {
  email?: string | null;
  message?: string | null;
  role: AccountMemberRole;
  status: AccountMemberStatus;
}

export interface AccountMemberUpdateRequest {
  role: AccountMemberRole;
  status: AccountMemberStatus;
}
