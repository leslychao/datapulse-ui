export interface AccountResponse {
  id: number;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AccountSummary = AccountResponse;

export interface AccountCreateRequest {
  name: string;
  active?: boolean;
}

export interface AccountUpdateRequest {
  name: string;
  active?: boolean;
}
