import {Injectable} from "@angular/core";
import {environment} from "../../../environments/environment";
import {APP_PATHS} from "../app-paths";
import {AUTH_SESSION_FLAG} from "./auth-storage";


@Injectable({providedIn: "root"})
export class AuthRedirectService {

  login(returnUrl: string = APP_PATHS.selectAccount): void {
    const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);
    const url = `${environment.auth.loginPath}?rd=${encodeURIComponent(normalizedReturnUrl)}`;
    window.location.assign(url);
  }

  logout(): void {
    sessionStorage.removeItem(AUTH_SESSION_FLAG);
    window.location.assign(APP_PATHS.root);
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
