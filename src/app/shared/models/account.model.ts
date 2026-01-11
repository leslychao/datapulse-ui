export interface AccountSummary {
  id: number;
  name: string;
  timezone: string;
  currency: string;
}

export interface AccountCreateRequest {
  name: string;
  timezone: string;
  currency: string;
}
