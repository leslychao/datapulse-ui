import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiClient } from "../../api-client.service";
import { MeResponse } from "../../../../shared/models";

@Injectable({ providedIn: "root" })
export class MeApi {

  constructor(private readonly api: ApiClient) {}

  me(): Observable<MeResponse> {
    return this.api.get<MeResponse>("/api/me");
  }
}
