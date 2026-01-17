export enum Marketplace {
  Wildberries = "WILDBERRIES",
  Ozon = "OZON"
}

export interface AccountConnectionResponse {
  id: number;
  accountId: number;
  marketplace: Marketplace;
  active: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AccountConnection = AccountConnectionResponse;

export interface WildberriesCredentials {
  token: string;
}

export interface OzonCredentials {
  clientId: string;
  apiKey: string;
}

export type AccountConnectionCredentials = WildberriesCredentials | OzonCredentials;

export interface AccountConnectionCreateRequest {
  marketplace: Marketplace;
  credentials: AccountConnectionCredentials;
  active?: boolean;
}

export interface AccountConnectionUpdateRequest {
  marketplace: Marketplace;
  credentials?: AccountConnectionCredentials;
  active?: boolean | null;
}

export interface AccountConnectionSyncStatus {
  status: AccountConnectionSyncStatusType;
  message: string | null;
  updatedAt: string;
}

export enum AccountConnectionSyncStatusType {
  Queued = "QUEUED",
  Running = "RUNNING",
  Completed = "COMPLETED",
  Failed = "FAILED"
}
