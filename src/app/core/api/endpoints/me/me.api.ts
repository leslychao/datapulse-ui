import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiClient } from "../../api-client.service";
import { UserProfileResponse } from "../../../../shared/models";

@Injectable({ providedIn: "root" })
export class MeApi {

  constructor(private readonly api: ApiClient) {}

  me(): Observable<UserProfileResponse> {
    return this.api.get<UserProfileResponse>("/api/iam");
  }
}
