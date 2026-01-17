import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {ApiClient} from "../api-client.service";
import {AccountCreateRequest, AccountResponse, AccountUpdateRequest} from "../../../shared/models";

@Injectable({providedIn: "root"})
export class AccountsApiClient {
  constructor(private readonly api: ApiClient) {}

  create(request: AccountCreateRequest): Observable<AccountResponse> {
    return this.api.post<AccountResponse, AccountCreateRequest>("/api/accounts", request);
  }

  update(accountId: number, request: AccountUpdateRequest): Observable<AccountResponse> {
    return this.api.put<AccountResponse, AccountUpdateRequest>(`/api/accounts/${accountId}`, request);
  }

  remove(accountId: number): Observable<void> {
    return this.api.delete<void>(`/api/accounts/${accountId}`);
  }
}
