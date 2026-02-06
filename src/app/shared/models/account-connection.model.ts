export enum Marketplace {
  Wildberries = "WILDBERRIES",
  Ozon = "OZON"
}

export enum AccountConnectionSyncStatus {
  New = "NEW",
  Success = "SUCCESS",
  NoData = "NO_DATA",
  Failed = "FAILED"
}

export interface AccountConnectionResponse {
  id: number;
  accountId: number;
  marketplace: Marketplace;
  active: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: AccountConnectionSyncStatus;
  createdAt: string;
  updatedAt: string;
  maskedCredentials: string | null;
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
}

export interface AccountConnectionUpdateRequest {
  credentials?: AccountConnectionCredentials;
  active?: boolean;
}
