import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {ApiClient} from "../../api-client.service";
import {
  AccountMember,
  AccountMemberCreateRequest,
  AccountMemberUpdateRequest
} from "../../../../shared/models";

@Injectable({providedIn: "root"})
export class AccountMemberApi {
  constructor(private readonly api: ApiClient) {}

  list(accountId: number): Observable<AccountMember[]> {
    return this.api.get<AccountMember[]>("/api/account-members", {accountId});
  }

  create(request: AccountMemberCreateRequest): Observable<AccountMember> {
    return this.api.post<AccountMember, AccountMemberCreateRequest>(
      "/api/account-members",
      request
    );
  }

  update(memberId: number, request: AccountMemberUpdateRequest): Observable<AccountMember> {
    return this.api.put<AccountMember, AccountMemberUpdateRequest>(
      `/api/account-members/${memberId}`,
      request
    );
  }
}
