import {Injectable} from "@angular/core";
import {NavigationEnd, Router} from "@angular/router";
import {filter} from "rxjs";

import {APP_PATHS} from "../app-paths";

const GLOBAL_LAST_URL_KEY = "datapulse.lastUrl";
const ACCOUNT_LAST_URL_PREFIX = "datapulse.lastUrl.account.";

@Injectable({providedIn: "root"})
export class LastVisitedPathService {
  constructor(private readonly router: Router) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects;
        const accountId = this.extractAccountId(url);
        if (accountId == null) {
          return;
        }

        // Пишем только «рабочие» страницы внутри /app/:accountId/...
        if (!url.startsWith(`/app/${accountId}/`)) {
          return;
        }

        sessionStorage.setItem(GLOBAL_LAST_URL_KEY, url);
        sessionStorage.setItem(this.accountKey(accountId), url);
      });
  }

  resolveHomePath(accountId: number): string {
    return this.getLastForAccount(accountId) ?? APP_PATHS.overview(accountId);
  }

  resolveAfterWorkspaceSwitch(accountId: number): string {
    return this.resolveHomePath(accountId);
  }

  getLastForAccount(accountId: number): string | null {
    const raw = sessionStorage.getItem(this.accountKey(accountId));
    return raw && raw.startsWith(`/app/${accountId}/`) ? raw : null;
  }

  getLastGlobal(): string | null {
    const raw = sessionStorage.getItem(GLOBAL_LAST_URL_KEY);
    return raw && raw.startsWith("/app/") ? raw : null;
  }

  clear(): void {
    const keysToRemove: string[] = [];
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (!key) {
        continue;
      }
      if (key === GLOBAL_LAST_URL_KEY || key.startsWith(ACCOUNT_LAST_URL_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
  }

  private accountKey(accountId: number): string {
    return `${ACCOUNT_LAST_URL_PREFIX}${accountId}`;
  }

  private extractAccountId(url: string): number | null {
    const match = url.match(/\/app\/(\d+)(?:\/|$)/);
    if (!match) {
      return null;
    }
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
