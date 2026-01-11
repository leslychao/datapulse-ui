import {Component, inject} from "@angular/core";
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
  private readonly authUser = inject(AuthUserService);
  private readonly authRedirect = inject(AuthRedirectService);
  readonly me$ = this.authUser.me$;

  logout(): void {
    this.authRedirect.logout();
  }
}
