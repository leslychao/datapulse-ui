import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

import { UserAccountAccess } from "./me.model";

@Injectable({ providedIn: "root" })
export class MeApi {

  constructor(private readonly http: HttpClient) {}

  accounts(): Observable<readonly UserAccountAccess[]> {
    return this.http.get<readonly UserAccountAccess[]>("/api/me/accounts");
  }
}
