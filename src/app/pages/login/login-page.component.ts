import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";

import {AuthRedirectService} from "../../core/auth";
import {ButtonComponent} from "../../shared/ui";
import {APP_PATHS} from "../../core/app-paths";

@Component({
  selector: "dp-login-page",
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: "./login-page.component.html",
  styleUrl: "./login-page.component.css"
})
export class LoginPageComponent {
  constructor(private readonly authRedirect: AuthRedirectService) {}

  login(): void {
    this.authRedirect.login(APP_PATHS.home);
  }
}
