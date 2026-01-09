import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class AuthRedirectService {

  login(returnUrl: string = "/"): void {
    window.location.assign(`/oauth2/start?rd=${encodeURIComponent(returnUrl)}`);
  }

  logout(): void {
    // возвращаемся на dev-server напрямую, чтобы не триггерить новый логин сразу
    window.location.assign(`/oauth2/sign_out?rd=${encodeURIComponent("http://localhost:4200/logged-out")}`);
  }

  register(): void {
    // Регистрация выполняется в Keycloak.
    const registrationUrl =
      "http://localhost:8081/realms/datapulse/login-actions/registration" +
      "?client_id=datapulse-bff" +
      "&redirect_uri=http://localhost:4180/oauth2/callback";

    window.location.assign(registrationUrl);
  }
}
