import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {ApiClient} from "../../api-client.service";
import {
  AccountConnection,
  AccountConnectionCreateRequest,
  AccountConnectionSyncStatus
} from "../../../../shared/models";

@Injectable({providedIn: "root"})
export class AccountConnectionApi {
  constructor(private readonly api: ApiClient) {}

  list(accountId: number): Observable<AccountConnection[]> {
    return this.api.get<AccountConnection[]>(`/api/account-connections/accounts/${accountId}`);
  }

  create(request: AccountConnectionCreateRequest): Observable<AccountConnection> {
    return this.api.post<AccountConnection, AccountConnectionCreateRequest>(
      "/api/account-connections",
      request
    );
  }

  test(connectionId: number): Observable<void> {
    return this.api.post<void, Record<string, never>>(
      `/api/account-connections/${connectionId}/test`,
      {}
    );
  }

  sync(connectionId: number): Observable<AccountConnectionSyncStatus> {
    return this.api.post<AccountConnectionSyncStatus, Record<string, never>>(
      `/api/account-connections/${connectionId}/sync`,
      {}
    );
  }

  syncStatus(connectionId: number): Observable<AccountConnectionSyncStatus> {
    return this.api.get<AccountConnectionSyncStatus>(
      `/api/account-connections/${connectionId}/sync/status`
    );
  }

  disable(connectionId: number): Observable<void> {
    return this.api.post<void, Record<string, never>>(
      `/api/account-connections/${connectionId}/disable`,
      {}
    );
  }
}
