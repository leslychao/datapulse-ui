export enum Marketplace {
  Wildberries = "WILDBERRIES",
  Ozon = "OZON"
}

export enum AccountConnectionStatus {
  Active = "ACTIVE",
  Disabled = "DISABLED",
  Error = "ERROR",
  Pending = "PENDING"
}

export interface AccountConnection {
  id: number;
  accountId: number;
  name: string;
  marketplace: Marketplace;
  status: AccountConnectionStatus;
  lastSyncAt: string | null;
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
  name: string;
  marketplace: Marketplace;
  credentials: AccountConnectionCredentials;
  active: boolean;
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
