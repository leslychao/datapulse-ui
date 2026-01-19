import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {ApiClient} from "../api-client.service";
import {AccountResponse, UserProfileResponse} from "../../../shared/models";

@Injectable({providedIn: "root"})
export class IamApiClient {
  constructor(private readonly api: ApiClient) {}

  getProfile(): Observable<UserProfileResponse> {
    return this.api.get<UserProfileResponse>("/api/iam");
  }

  getAccessibleAccounts(): Observable<AccountResponse[]> {
    return this.api.get<AccountResponse[]>("/api/iam/accounts");
  }
}
