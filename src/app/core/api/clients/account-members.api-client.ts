import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {ApiClient} from "../api-client.service";
import {
  AccountMemberCreateRequest,
  AccountMemberResponse,
  AccountMemberUpdateRequest
} from "../../../shared/models";

@Injectable({providedIn: "root"})
export class AccountMembersApiClient {
  constructor(private readonly api: ApiClient) {}

  listMembers(accountId: number): Observable<AccountMemberResponse[]> {
    return this.list(accountId);
  }

  createMember(
    accountId: number,
    request: AccountMemberCreateRequest
  ): Observable<AccountMemberResponse> {
    return this.create(accountId, request);
  }

  updateMember(
    accountId: number,
    memberId: number,
    request: AccountMemberUpdateRequest
  ): Observable<AccountMemberResponse> {
    return this.update(accountId, memberId, request);
  }

  deleteMember(accountId: number, memberId: number): Observable<void> {
    return this.remove(accountId, memberId);
  }

  list(accountId: number): Observable<AccountMemberResponse[]> {
    return this.api.get<AccountMemberResponse[]>(`/api/accounts/${accountId}/members`);
  }

  create(
    accountId: number,
    request: AccountMemberCreateRequest
  ): Observable<AccountMemberResponse> {
    return this.api.post<AccountMemberResponse, AccountMemberCreateRequest>(
      `/api/accounts/${accountId}/members`,
      request
    );
  }

  update(
    accountId: number,
    memberId: number,
    request: AccountMemberUpdateRequest
  ): Observable<AccountMemberResponse> {
    return this.api.put<AccountMemberResponse, AccountMemberUpdateRequest>(
      `/api/accounts/${accountId}/members/${memberId}`,
      request
    );
  }

  remove(accountId: number, memberId: number): Observable<void> {
    return this.api.delete<void>(`/api/accounts/${accountId}/members/${memberId}`);
  }
}
