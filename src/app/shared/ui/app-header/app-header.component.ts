import {ChangeDetectionStrategy, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {RouterModule} from "@angular/router";

import {AuthRedirectService, AuthSessionService, AuthUserService} from "../../../core/auth";
import {APP_PATHS} from "../../../core/app-paths";
import {AccountContextService} from "../../../core/state";
import {ButtonComponent} from "../button/button.component";

@Component({
  selector: "dp-app-header",
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: "./app-header.component.html",
  styleUrl: "./app-header.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppHeaderComponent {
  private readonly authUser = inject(AuthUserService);
  private readonly authSession = inject(AuthSessionService);
  private readonly authRedirect = inject(AuthRedirectService);
  private readonly accountContext = inject(AccountContextService);

  readonly userProfile$ = this.authUser.userProfile$;
  get homePath(): string {
    if (!this.authSession.snapshot().authenticated) {
      return APP_PATHS.login;
    }

    const accountId = this.accountContext.snapshot;
    return accountId != null ? APP_PATHS.homeSummary(accountId) : APP_PATHS.selectAccount;
  }

  login(): void {
    this.authRedirect.login(window.location.pathname + window.location.search);
  }

  logout(): void {
    this.authRedirect.logout();
  }
}
