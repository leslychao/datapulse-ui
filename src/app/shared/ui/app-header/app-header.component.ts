import {ChangeDetectionStrategy, Component, DestroyRef, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {NavigationStart, Router, RouterModule} from "@angular/router";
import {of, switchMap} from "rxjs";
import {filter} from "rxjs/operators";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AuthRedirectService, AuthSessionService, AuthUserService} from "../../../core/auth";
import {APP_PATHS} from "../../../core/app-paths";
import {IamApiClient, ApiError} from "../../../core/api";
import {AccountContextService} from "../../../core/state";
import {ButtonComponent} from "../button/button.component";
import {AccountSwitcherComponent} from "../account-switcher/account-switcher.component";
import {LoadState, toLoadState} from "../../operators/to-load-state";
import {AccountResponse} from "../../models";

@Component({
  selector: "dp-app-header",
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent, AccountSwitcherComponent],
  templateUrl: "./app-header.component.html",
  styleUrl: "./app-header.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppHeaderComponent {
  private readonly authUser = inject(AuthUserService);
  private readonly authSession = inject(AuthSessionService);
  private readonly authRedirect = inject(AuthRedirectService);
  private readonly iamApi = inject(IamApiClient);
  private readonly accountContext = inject(AccountContextService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly userProfile$ = this.authUser.userProfile$;
  readonly workspacesState$ = this.authSession.state$.pipe(
    switchMap((state) => {
      if (!state.authenticated) {
        return of({status: "ready", data: []} as LoadState<AccountResponse[], ApiError>);
      }
      return this.iamApi.getAccessibleAccounts().pipe(toLoadState<AccountResponse[], ApiError>());
    })
  );
  readonly activeWorkspace$ = this.accountContext.accountId$;
  isLoginRedirecting = false;
  isLogoutRedirecting = false;

  get homePath(): string {
    if (!this.authSession.snapshot().authenticated) {
      return APP_PATHS.login;
    }

    const accountId = this.accountContext.snapshot;
    return accountId != null ? APP_PATHS.overview(accountId) : APP_PATHS.workspaces;
  }

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.isLogoutRedirecting = false;
        this.isLoginRedirecting = false;
      });
  }

  login(): void {
    if (this.isLoginRedirecting) {
      return;
    }
    this.isLoginRedirecting = true;
    this.authRedirect.login(window.location.pathname + window.location.search);
  }

  logout(): void {
    if (this.isLogoutRedirecting) {
      return;
    }
    this.isLogoutRedirecting = true;
    this.authRedirect.logout();
  }

  goToCreateWorkspace(): void {
    this.router.navigateByUrl(APP_PATHS.workspacesCreate);
  }

  goToWorkspaces(): void {
    this.router.navigateByUrl(APP_PATHS.workspaces);
  }

  goToWorkspaceSettings(accountId: number): void {
    this.router.navigateByUrl(APP_PATHS.workspaceSettings(accountId));
  }

  goToProfile(): void {
    this.router.navigateByUrl(APP_PATHS.profile);
  }

  selectWorkspace(accountId: number): void {
    if (!Number.isFinite(accountId)) {
      return;
    }
    this.accountContext.setAccountId(accountId);
    this.router.navigateByUrl(APP_PATHS.overview(accountId));
  }
}
