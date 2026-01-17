import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {ApiClient} from "../api-client.service";
import {AccountResponse, UserProfileResponse} from "../../../shared/models";

@Injectable({providedIn: "root"})
export class IamApiClient {
  constructor(private readonly api: ApiClient) {}

  getUserProfile(): Observable<UserProfileResponse> {
    return this.api.get<UserProfileResponse>("/api/iam");
  }

  getAccounts(): Observable<AccountResponse[]> {
    return this.api.get<AccountResponse[]>("/api/iam/accounts");
  }

  getProfile(): Observable<UserProfileResponse> {
    return this.getUserProfile();
  }

  listAccounts(): Observable<AccountResponse[]> {
    return this.getAccounts();
  }
}
