import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {ApiClient} from "../../core/api/api-client.service";
import {AccountCreateRequest, AccountSummary} from "../../models/account.model";

@Injectable({providedIn: "root"})
export class AccountApi {
  constructor(private readonly api: ApiClient) {}

  list(): Observable<AccountSummary[]> {
    return this.api.get<AccountSummary[]>("/api/accounts");
  }

  create(request: AccountCreateRequest): Observable<AccountSummary> {
    return this.api.post<AccountSummary, AccountCreateRequest>("/api/accounts", request);
  }
}
