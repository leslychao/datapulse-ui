import {Injectable, NgZone} from "@angular/core";
import {NavigationEnd, Router} from "@angular/router";
import {BehaviorSubject, distinctUntilChanged, filter, map} from "rxjs";

const STORAGE_KEY_ID = "datapulse.accountId";
const STORAGE_KEY_NAME = "datapulse.accountName";

export type WorkspaceRef = {
  id: number;
  name: string | null;
};

@Injectable({providedIn: "root"})
export class AccountContextService {
  private readonly accountIdSubject = new BehaviorSubject<number | null>(this.readAccountId());
  readonly accountId$ = this.accountIdSubject.asObservable().pipe(distinctUntilChanged());

  private readonly accountNameSubject = new BehaviorSubject<string | null>(this.readAccountName());
  readonly accountName$ = this.accountNameSubject.asObservable().pipe(distinctUntilChanged());

  /**
   * Для удобства в UI: единый объект "текущий workspace".
   * Важно: имя может быть null, если оно ещё не было загружено/проставлено.
   */
  readonly workspaceRef$ = this.accountId$.pipe(
    map((accountId) => {
      if (accountId == null) {
        return null;
      }
      return {id: accountId, name: this.accountNameSubject.value} satisfies WorkspaceRef;
    }),
    distinctUntilChanged((left, right) => left?.id === right?.id && left?.name === right?.name)
  );

  constructor(private readonly router: Router, private readonly zone: NgZone) {
    // AccountContext — единый источник истины, синхронизированный с URL.
    // Это убирает рассинхрон: URL уже поменялся, а header/sidebar ещё показывают старый workspace.
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const accountIdFromUrl = this.extractAccountIdFromUrl(event.urlAfterRedirects);
        if (accountIdFromUrl == null) {
          return;
        }

        // На всякий случай гарантируем выполнение в Angular zone,
        // чтобы OnPush-компоненты получали корректный change detection cycle после смены workspace.
        this.zone.run(() => {
          if (this.accountIdSubject.value !== accountIdFromUrl) {
            // Имя из URL мы не можем достать надёжно, поэтому сохраняем текущее.
            this.setWorkspace({id: accountIdFromUrl, name: this.accountNameSubject.value});
          }
        });
      });
  }

  get snapshot(): number | null {
    return this.accountIdSubject.value;
  }

  get nameSnapshot(): string | null {
    return this.accountNameSubject.value;
  }

  /**
   * Основной API: выставляет и id, и имя.
   * Используй его там, где у тебя есть объект воркспейса (например, при выборе из списка).
   */
  setWorkspace(workspace: WorkspaceRef | null): void {
    if (workspace == null) {
      this.accountIdSubject.next(null);
      this.accountNameSubject.next(null);
      localStorage.removeItem(STORAGE_KEY_ID);
      localStorage.removeItem(STORAGE_KEY_NAME);
      return;
    }

    this.accountIdSubject.next(workspace.id);
    this.accountNameSubject.next(this.normalizeName(workspace.name));

    localStorage.setItem(STORAGE_KEY_ID, String(workspace.id));
    const normalizedName = this.accountNameSubject.value;
    if (normalizedName == null) {
      localStorage.removeItem(STORAGE_KEY_NAME);
    } else {
      localStorage.setItem(STORAGE_KEY_NAME, normalizedName);
    }
  }

  /**
   * Backward compatible API: старые места кода продолжают работать.
   * Имя при этом не меняем.
   */
  setAccountId(accountId: number | null): void {
    if (accountId == null) {
      this.setWorkspace(null);
      return;
    }
    this.setWorkspace({id: accountId, name: this.accountNameSubject.value});
  }

  /**
   * Обновляет только имя (например, когда оно стало известно после загрузки каталога).
   */
  setAccountName(accountName: string | null): void {
    const normalized = this.normalizeName(accountName);
    this.accountNameSubject.next(normalized);

    if (normalized == null) {
      localStorage.removeItem(STORAGE_KEY_NAME);
    } else {
      localStorage.setItem(STORAGE_KEY_NAME, normalized);
    }
  }

  clear(): void {
    this.setWorkspace(null);
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
    const raw = localStorage.getItem(STORAGE_KEY_ID);
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private readAccountName(): string | null {
    const raw = localStorage.getItem(STORAGE_KEY_NAME);
    return this.normalizeName(raw);
  }

  private normalizeName(value: string | null | undefined): string | null {
    const normalized = value?.trim() ?? null;
    return normalized && normalized.length ? normalized : null;
  }
}
