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

export interface AccountMemberResponse {
  id: number;
  accountId: number;
  status: AccountMemberStatus;
  role: AccountMemberRole;
  lastLoginAt: string | null;
}

export type AccountMember = AccountMemberResponse;

export interface AccountMemberCreateRequest {
  role: AccountMemberRole;
}

export interface AccountMemberUpdateRequest {
  role?: AccountMemberRole;
  status?: AccountMemberStatus;
}
