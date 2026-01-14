import {Injectable} from "@angular/core";
import {Observable, of} from "rxjs";
import {catchError, map} from "rxjs/operators";

import {AccountMemberApi} from "../core/api";
import {DataState, DATA_STATE} from "../shared/models";
import {mapAccountMemberToVm} from "../mappers/account-member.mapper";
import {MemberVm} from "../vm/member.vm";

export interface MembersQueryResult {
  state: DataState;
  data: MemberVm[];
}

@Injectable({providedIn: "root"})
export class MembersQuery {
  constructor(private readonly memberApi: AccountMemberApi) {}

  load(accountId: number | null): Observable<MembersQueryResult> {
    if (accountId == null) {
      return of({state: DATA_STATE.notConnected, data: []});
    }
    return this.memberApi.list(accountId).pipe(
      map((members) => {
        const mapped = members.map(mapAccountMemberToVm);
        if (mapped.length === 0) {
          return {state: DATA_STATE.noData, data: mapped};
        }
        return {state: DATA_STATE.ready, data: mapped};
      }),
      catchError(() => of({state: DATA_STATE.error, data: []}))
    );
  }
}
