export interface AccountResponse {
  id: number;
  name: string;
  description?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AccountSummary = AccountResponse;

export interface AccountCreateRequest {
  name: string;
  description?: string | null;
  active?: boolean;
}

export interface AccountUpdateRequest {
  name: string;
  description?: string | null;
  active?: boolean;
}
