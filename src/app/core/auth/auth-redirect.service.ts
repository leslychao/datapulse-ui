import {Injectable} from "@angular/core";
import {environment} from "../../../environments/environment";
import {Router} from "@angular/router";
import {APP_PATHS} from "../app-paths";
import {AuthSessionService} from "./auth-session.service";
import {AUTH_SESSION_FLAG} from "./auth-storage";
import {AccountContextService} from "../state";


@Injectable({providedIn: "root"})
export class AuthRedirectService {
  constructor(
    private readonly authSession: AuthSessionService,
    private readonly accountContext: AccountContextService,
    private readonly router: Router
  ) {}

  login(returnUrl: string = APP_PATHS.selectAccount): void {
    const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);
    const url = `${environment.auth.loginPath}?rd=${encodeURIComponent(normalizedReturnUrl)}`;
    window.location.assign(url);
  }

  logout(): void {
    this.authSession.clear();
    sessionStorage.removeItem(AUTH_SESSION_FLAG);
    this.accountContext.clear();
    this.router.navigateByUrl(APP_PATHS.login, {replaceUrl: true});
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
}
