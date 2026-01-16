import {Injectable} from "@angular/core";
import {BehaviorSubject, Observable, of, throwError} from "rxjs";
import {catchError, finalize, map, shareReplay, tap} from "rxjs/operators";

import {ApiError, IamApiClient} from "../api";
import {AccountSummary} from "../../shared/models";

type AccountCatalogState = {
  accounts: AccountSummary[] | null;
  error: ApiError | null;
};

const INITIAL_STATE: AccountCatalogState = {
  accounts: null,
  error: null
};

@Injectable({providedIn: "root"})
export class AccountCatalogService {
  private readonly stateSubject = new BehaviorSubject<AccountCatalogState>(INITIAL_STATE);
  readonly state$ = this.stateSubject.asObservable();

  private loadInFlight: Observable<AccountSummary[]> | null = null;

  constructor(private readonly iamApi: IamApiClient) {}

  load(force = false): Observable<AccountSummary[]> {
    const snapshot = this.stateSubject.value;
    if (!force && snapshot.accounts) {
      return of(snapshot.accounts);
    }

    if (this.loadInFlight) {
      return this.loadInFlight;
    }

    this.loadInFlight = this.iamApi.listAccounts().pipe(
      tap((accounts) => {
        this.stateSubject.next({accounts, error: null});
      }),
      catchError((error: ApiError) => {
        this.stateSubject.next({accounts: [], error});
        return throwError(() => error);
      }),
      finalize(() => {
        this.loadInFlight = null;
      }),
      shareReplay({bufferSize: 1, refCount: false})
    );

    return this.loadInFlight;
  }

  get accountsSnapshot(): AccountSummary[] {
    return this.stateSubject.value.accounts ?? [];
  }

  get errorSnapshot(): ApiError | null {
    return this.stateSubject.value.error;
  }

  reset(): void {
    this.stateSubject.next(INITIAL_STATE);
  }

  hasAccounts(): Observable<boolean> {
    return this.load().pipe(map((accounts) => accounts.length > 0));
  }
}
