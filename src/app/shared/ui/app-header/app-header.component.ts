import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";

import {AuthRedirectService, AuthUserService} from "../../../core/auth";
import {ButtonComponent} from "../button/button.component";

@Component({
  selector: "dp-app-header",
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: "./app-header.component.html",
  styleUrl: "./app-header.component.css"
})
export class AppHeaderComponent {
  readonly me$ = this.authUser.me$;

  constructor(
    private readonly authUser: AuthUserService,
    private readonly authRedirect: AuthRedirectService
  ) {}

  logout(): void {
    this.authRedirect.logout();
  }
}
