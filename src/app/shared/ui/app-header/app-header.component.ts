import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject
} from "@angular/core";
import {CommonModule} from "@angular/common";
import {NavigationStart, Router, RouterModule} from "@angular/router";
import {combineLatest, map} from "rxjs";
import {filter} from "rxjs/operators";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AuthRedirectService, AuthSessionService, AuthUserService} from "../../../core/auth";
import {APP_PATHS} from "../../../core/app-paths";
import {AccountContextService} from "../../../core/state";
import {ButtonComponent} from "../button/button.component";

type UserProfileLike = {
  fullName?: string | null;
  username?: string | null;
  email?: string | null;
  keycloakSub?: string | null;
};

type WorkspaceTree = {
  full: string;
  leaf: string;
};

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
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly userProfile$ = this.authUser.userProfile$;
  private readonly currentAccountId$ = this.accountContext.accountId$;
  readonly homePath$ = combineLatest([this.authSession.state$, this.currentAccountId$]).pipe(
    map(([state, accountId]) => {
      if (!state.authenticated) {
        return APP_PATHS.login;
      }
      return accountId != null ? APP_PATHS.overview(accountId) : APP_PATHS.workspaces;
    })
  );
  readonly profilePath$ = this.currentAccountId$.pipe(
    map((accountId) =>
      accountId != null ? APP_PATHS.settingsProfile(accountId) : APP_PATHS.workspaces
    )
  );
  readonly currentWorkspaceBreadcrumb$ = this.currentAccountId$.pipe(
    map((accountId) => (accountId == null ? null : `Workspaces ▸ Workspace #${accountId}`))
  );
  readonly currentWorkspaceTree$ = this.currentAccountId$.pipe(
    map((accountId) => {
      if (accountId == null) {
        return null;
      }
      const leaf = `Workspace #${accountId}`;
      return {
        full: `Workspaces ▸ ${leaf}`,
        leaf
      };
    })
  );

  isLoginRedirecting = false;
  isLogoutRedirecting = false;
  isMenuOpen = false;

  get workspacesPath(): string {
    return APP_PATHS.workspaces;
  }

  constructor() {
    this.router.events
    .pipe(
      filter((event) => event instanceof NavigationStart),
      takeUntilDestroyed(this.destroyRef)
    )
    .subscribe(() => {
      this.closeMenu();
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

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  getInitial(profile: UserProfileLike): string {
    const source = profile.fullName || profile.username || profile.email || "U";
    const normalized = source.trim();
    if (!normalized) {
      return "U";
    }
    return normalized.charAt(0).toUpperCase();
  }

  @HostListener("document:keydown", ["$event"])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== "Escape" || !this.isMenuOpen) {
      return;
    }
    this.closeMenu();
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isMenuOpen) {
      return;
    }

    const target = event.target as Node | null;
    if (target && this.elementRef.nativeElement.contains(target)) {
      return;
    }
    this.closeMenu();
  }
}
