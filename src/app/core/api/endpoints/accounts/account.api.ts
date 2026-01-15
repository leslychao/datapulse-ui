import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {ApiClient} from "../../api-client.service";
import {AccountCreateRequest, AccountSummary, AccountUpdateRequest} from "../../../../shared/models";

@Injectable({providedIn: "root"})
export class AccountApi {
  constructor(private readonly api: ApiClient) {}

  list(): Observable<AccountSummary[]> {
    return this.api.get<AccountSummary[]>("/api/iam/accounts");
  }

  create(request: AccountCreateRequest): Observable<AccountSummary> {
    return this.api.post<AccountSummary, AccountCreateRequest>("/api/accounts", request);
  }

  update(accountId: number, request: AccountUpdateRequest): Observable<AccountSummary> {
    return this.api.put<AccountSummary, AccountUpdateRequest>(`/api/accounts/${accountId}`, request);
  }
}
