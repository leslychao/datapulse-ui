export enum Marketplace {
  Wildberries = "WILDBERRIES",
  Ozon = "OZON"
}

export interface AccountConnection {
  id: number;
  accountId: number;
  marketplace: Marketplace;
  active: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  createdAt: string;
  updatedAt: string;
  maskedCredentials: string | null;
}

export interface WildberriesCredentials {
  token: string;
}

export interface OzonCredentials {
  clientId: string;
  apiKey: string;
}

export type AccountConnectionCredentials = WildberriesCredentials | OzonCredentials;

export interface AccountConnectionCreateRequest {
  accountId: number;
  marketplace: Marketplace;
  credentials: AccountConnectionCredentials;
  active?: boolean;
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
