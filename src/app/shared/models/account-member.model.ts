export enum AccountMemberStatus {
  Active = "ACTIVE",
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
  status: AccountMemberStatus;
  role: AccountMemberRole;
  createdAt: string;
  updatedAt: string | null;
}

export type AccountMember = AccountMemberResponse;

export interface AccountMemberCreateRequest {
  userId?: number;
  role: AccountMemberRole;
  status: AccountMemberStatus;
}

export interface AccountMemberUpdateRequest {
  role: AccountMemberRole;
  status: AccountMemberStatus;
}
