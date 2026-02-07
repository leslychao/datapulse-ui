import {Injectable} from "@angular/core";
import {BehaviorSubject, defer, Observable, of} from "rxjs";

const STORAGE_KEY = "datapulse.accountId";

@Injectable({providedIn: "root"})
export class AccountContextService {
  private readonly accountIdSubject = new BehaviorSubject<number | null>(this.readAccountId());
  readonly accountId$ = this.accountIdSubject.asObservable();

  get snapshot(): number | null {
    return this.accountIdSubject.value;
  }

  setAccountId(accountId: number | null): void {
    this.accountIdSubject.next(accountId);
    if (accountId == null) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, String(accountId));
  }

  setCurrentWorkspace(accountId: number): Observable<void> {
    return defer(() => {
      this.setAccountId(accountId);
      return of(void 0);
    });
  }

  clear(): void {
    this.setAccountId(null);
  }

  private readAccountId(): number | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
