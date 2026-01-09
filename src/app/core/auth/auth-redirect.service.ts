import {Injectable} from "@angular/core";
import {environment} from "../../../environments/environment";

@Injectable({providedIn: "root"})
export class AuthRedirectService {

  login(returnUrl: string = "/"): void {
    const url = `${environment.auth.loginPath}?rd=${encodeURIComponent(returnUrl)}`;
    window.location.assign(url);
  }

  logout(): void {
    const url =
      `${environment.auth.logoutPath}?rd=${encodeURIComponent(environment.auth.logoutRedirectUrl)}`;
    window.location.assign(url);
  }

  register(): void {
    const keycloak = environment.auth.keycloak;

    const registrationUrl =
      `${keycloak.baseUrl}/realms/${encodeURIComponent(keycloak.realm)}/login-actions/registration` +
      `?client_id=${encodeURIComponent(keycloak.registrationClientId)}` +
      `&redirect_uri=${encodeURIComponent(keycloak.registrationRedirectUri)}`;

    window.location.assign(registrationUrl);
  }
}
