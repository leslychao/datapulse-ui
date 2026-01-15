export interface AccountSummary {
  id: number;
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountCreateRequest {
  name: string;
  active: boolean;
}
