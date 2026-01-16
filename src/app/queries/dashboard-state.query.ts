import {Injectable} from "@angular/core";
import {Observable, of} from "rxjs";
import {catchError, map} from "rxjs/operators";

import {AccountConnectionsApiClient} from "../core/api";
import {DataState, DATA_STATE} from "../shared/models";

export interface DashboardStateResult {
  state: DataState;
}

@Injectable({providedIn: "root"})
export class DashboardStateQuery {
  constructor(private readonly connectionApi: AccountConnectionsApiClient) {}

  getState(accountId: number | null, fallbackState: DataState): Observable<DashboardStateResult> {
    if (accountId == null) {
      return of({state: DATA_STATE.notConnected});
    }
    return this.connectionApi.list(accountId).pipe(
      map((connections) => {
        if (!connections || connections.length === 0) {
          return {state: DATA_STATE.notConnected};
        }
        return {state: fallbackState};
      }),
      catchError(() => of({state: DATA_STATE.error}))
    );
  }
}
