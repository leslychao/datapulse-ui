import {Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {RouterModule} from "@angular/router";

import {AuthRedirectService, AuthUserService} from "../../../core/auth";
import {ButtonComponent} from "../button/button.component";

@Component({
  selector: "dp-app-header",
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: "./app-header.component.html",
  styleUrl: "./app-header.component.css"
})
export class AppHeaderComponent {
  private readonly authUser = inject(AuthUserService);
  private readonly authRedirect = inject(AuthRedirectService);

  readonly userProfile$ = this.authUser.userProfile$;

  login(): void {
    this.authRedirect.login(window.location.pathname + window.location.search);
  }

  logout(): void {
    this.authRedirect.logout();
  }
}
