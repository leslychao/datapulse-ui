import {Injectable, NgZone} from "@angular/core";
import {NavigationEnd, Router} from "@angular/router";
import {BehaviorSubject, filter} from "rxjs";

const STORAGE_KEY = "datapulse.accountId";

@Injectable({providedIn: "root"})
export class AccountContextService {
  private readonly accountIdSubject = new BehaviorSubject<number | null>(this.readAccountId());
  readonly accountId$ = this.accountIdSubject.asObservable();

  constructor(private readonly router: Router, private readonly zone: NgZone) {
    // Делаем AccountContext единым источником истины, синхронизированным с URL.
    // Это убирает рассинхрон: URL уже поменялся, а header/sidebar ещё показывают старый workspace.
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const accountIdFromUrl = this.extractAccountIdFromUrl(event.urlAfterRedirects);
        if (accountIdFromUrl == null) {
          return;
        }

        // На всякий случай гарантируем выполнение в Angular zone, чтобы OnPush-компоненты
        // получали корректный change detection cycle после смены workspace.
        this.zone.run(() => {
          if (this.accountIdSubject.value !== accountIdFromUrl) {
            this.setAccountId(accountIdFromUrl);
          }
        });
      });
  }

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

  clear(): void {
    this.setAccountId(null);
  }

  private extractAccountIdFromUrl(url: string): number | null {
    // /app/:accountId/... или /workspaces/:accountId
    const match = url.match(/\/(?:app|workspaces)\/(\d+)(?:\/|$)/);
    if (!match) {
      return null;
    }
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
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
