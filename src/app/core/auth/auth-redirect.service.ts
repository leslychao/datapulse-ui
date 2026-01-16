import {Injectable} from "@angular/core";
import {environment} from "../../../environments/environment";
import {APP_PATHS} from "../app-paths";
import {AuthSessionService} from "./auth-session.service";
import {AUTH_SESSION_FLAG} from "./auth-storage";
import {AccountCatalogService, AccountContextService} from "../state";


@Injectable({providedIn: "root"})
export class AuthRedirectService {
  constructor(
    private readonly authSession: AuthSessionService,
    private readonly accountContext: AccountContextService,
    private readonly accountCatalog: AccountCatalogService
  ) {}

  login(returnUrl: string = APP_PATHS.selectAccount): void {
    const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);
    const url = `${environment.auth.loginPath}?rd=${encodeURIComponent(normalizedReturnUrl)}`;
    window.location.assign(url);
  }

  logout(): void {
    this.authSession.clear();
    sessionStorage.removeItem(AUTH_SESSION_FLAG);
    localStorage.removeItem("datapulse.accountId");
    this.accountContext.clear();
    this.accountCatalog.reset();
    window.location.assign(this.buildLogoutUrl());
  }

  register(): void {
    const keycloak = environment.auth.keycloak;

    const registrationUrl =
      `${keycloak.baseUrl}/realms/${encodeURIComponent(keycloak.realm)}/login-actions/registration` +
      `?client_id=${encodeURIComponent(keycloak.registrationClientId)}` +
      `&redirect_uri=${encodeURIComponent(keycloak.registrationRedirectUri)}`;

    window.location.assign(registrationUrl);
  }

  private normalizeReturnUrl(returnUrl: string): string {
    const trimmed = returnUrl.trim();

    if (!trimmed || trimmed === "/" || trimmed === "/logged-out") {
      return APP_PATHS.selectAccount;
    }

    if (trimmed.startsWith("/oauth2")) {
      return APP_PATHS.selectAccount;
    }

    return trimmed;
  }

  private buildLogoutUrl(): string {
    const logoutPath = environment.auth.logoutPath;
    const redirectUrl = environment.auth.logoutRedirectUrl?.trim();

    if (!redirectUrl) {
      return logoutPath;
    }

    const separator = logoutPath.includes("?") ? "&" : "?";
    return `${logoutPath}${separator}rd=${encodeURIComponent(redirectUrl)}`;
  }
}
