import {Injectable} from "@angular/core";
import {Observable, of} from "rxjs";
import {catchError, map} from "rxjs/operators";

import {AccountConnectionsApiClient} from "../core/api";
import {DataState, DATA_STATE} from "../shared/models";
import {mapAccountConnectionToVm} from "../mappers/account-connection.mapper";
import {ConnectionVm} from "../vm/connection.vm";

export interface ConnectionsQueryResult {
  state: DataState;
  data: ConnectionVm[];
}

@Injectable({providedIn: "root"})
export class ConnectionsQuery {
  constructor(private readonly connectionApi: AccountConnectionsApiClient) {}

  load(accountId: number | null): Observable<ConnectionsQueryResult> {
    if (accountId == null) {
      return of({state: DATA_STATE.notConnected, data: []});
    }
    return this.connectionApi.list(accountId).pipe(
      map((connections) => {
        const mapped = connections.map(mapAccountConnectionToVm);
        if (mapped.length === 0) {
          return {state: DATA_STATE.notConnected, data: mapped};
        }
        return {state: DATA_STATE.ready, data: mapped};
      }),
      catchError(() => of({state: DATA_STATE.error, data: []}))
    );
  }
}
