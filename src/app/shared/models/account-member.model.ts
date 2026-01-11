export enum AccountMemberStatus {
  Active = "ACTIVE",
  Invited = "INVITED",
  Blocked = "BLOCKED"
}

export enum AccountMemberRole {
  Owner = "OWNER",
  Admin = "ADMIN",
  Analyst = "ANALYST",
  Operator = "OPERATOR"
}

export enum AccountMemberAccessScope {
  All = "ALL",
  Selected = "SELECTED"
}

export interface AccountMember {
  id: number;
  accountId: number;
  email: string;
  status: AccountMemberStatus;
  role: AccountMemberRole;
  accessScope: AccountMemberAccessScope;
  connectionIds: number[];
  lastLoginAt: string | null;
}

export interface AccountMemberCreateRequest {
  accountId: number;
  email: string;
  role: AccountMemberRole;
  accessScope: AccountMemberAccessScope;
  connectionIds: number[];
}

export interface AccountMemberUpdateRequest {
  role?: AccountMemberRole;
  status?: AccountMemberStatus;
  accessScope?: AccountMemberAccessScope;
  connectionIds?: number[];
}
