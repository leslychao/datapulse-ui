import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { MeResponse } from "./me.model";

@Injectable({ providedIn: "root" })
export class MeApi {

  constructor(private readonly http: HttpClient) {}

  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>("/api/user-profiles/me");
  }
}
