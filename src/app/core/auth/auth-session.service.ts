import {Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {BehaviorSubject, catchError, map, Observable, of, tap} from "rxjs";

import {AuthSessionState, OAuth2ProxyUserInfo} from "./auth-session.model";
import {OAUTH2_ENDPOINTS} from "./auth-endpoints";

@Injectable({providedIn: "root"})
export class AuthSessionService {

  private readonly stateSubject = new BehaviorSubject<AuthSessionState>({authenticated: false});
  readonly state$ = this.stateSubject.asObservable();

  constructor(private readonly http: HttpClient) {
  }

  refresh(): Observable<AuthSessionState> {
    return this.http.get<OAuth2ProxyUserInfo>(OAUTH2_ENDPOINTS.userInfo).pipe(
      map((userInfo) => ({authenticated: true, userInfo} as AuthSessionState)),
      catchError(() => of({authenticated: false} as AuthSessionState)),
      tap((state) => this.stateSubject.next(state))
    );
  }

  snapshot(): AuthSessionState {
    return this.stateSubject.value;
  }

  clear(): void {
    this.stateSubject.next({authenticated: false});
  }
}
