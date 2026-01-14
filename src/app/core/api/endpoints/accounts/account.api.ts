import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {ApiClient} from "../../api-client.service";
import {AccountCreateRequest, AccountSummary} from "../../../../shared/models";

@Injectable({providedIn: "root"})
export class AccountApi {
  constructor(private readonly api: ApiClient) {}

  list(): Observable<AccountSummary[]> {
    return this.api.get<AccountSummary[]>("/api/iam/accounts");
  }

  create(request: AccountCreateRequest): Observable<AccountSummary> {
    return this.api.post<AccountSummary, AccountCreateRequest>("/api/accounts", request);
  }
}
