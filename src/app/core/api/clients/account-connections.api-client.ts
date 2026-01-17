import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {ApiClient} from "../api-client.service";
import {
  AccountConnectionResponse,
  AccountConnectionCreateRequest,
  AccountConnectionUpdateRequest
} from "../../../shared/models";

@Injectable({providedIn: "root"})
export class AccountConnectionsApiClient {
  constructor(private readonly api: ApiClient) {}

  list(accountId: number): Observable<AccountConnectionResponse[]> {
    return this.api.get<AccountConnectionResponse[]>(`/api/accounts/${accountId}/connections`);
  }

  create(
    accountId: number,
    request: AccountConnectionCreateRequest
  ): Observable<AccountConnectionResponse> {
    return this.api.post<AccountConnectionResponse, AccountConnectionCreateRequest>(
      `/api/accounts/${accountId}/connections`,
      request
    );
  }

  update(
    accountId: number,
    connectionId: number,
    request: AccountConnectionUpdateRequest
  ): Observable<AccountConnectionResponse> {
    return this.api.put<AccountConnectionResponse, AccountConnectionUpdateRequest>(
      `/api/accounts/${accountId}/connections/${connectionId}`,
      request
    );
  }

  updateFromConnection(
    accountId: number,
    connection: AccountConnectionResponse,
    update: Omit<AccountConnectionUpdateRequest, "marketplace">
  ): Observable<AccountConnectionResponse> {
    return this.update(accountId, connection.id, {
      marketplace: connection.marketplace,
      ...update
    });
  }

  remove(accountId: number, connectionId: number): Observable<void> {
    return this.api.delete<void>(`/api/accounts/${accountId}/connections/${connectionId}`);
  }
}
