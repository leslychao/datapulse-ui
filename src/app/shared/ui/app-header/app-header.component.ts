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

  isLoginRedirecting = false;
  isLogoutRedirecting = false;
  isMenuOpen = false;

  get homePath(): string {
    if (!this.authSession.snapshot().authenticated) {
      return APP_PATHS.login;
    }

    const accountId = this.accountContext.snapshot;
    return accountId != null ? APP_PATHS.overview(accountId) : APP_PATHS.workspaces;
  }

  get profilePath(): string {
    const accountId = this.accountContext.snapshot;
    return accountId != null ? APP_PATHS.settingsProfile(accountId) : APP_PATHS.workspaces;
  }

  get workspacesPath(): string {
    return APP_PATHS.workspaces;
  }

  get currentWorkspaceBreadcrumb(): string | null {
    const accountId = this.accountContext.snapshot;
    if (accountId == null) {
      return null;
    }
    return `Workspaces ▸ Workspace #${accountId}`;
  }

  get currentWorkspaceTree(): WorkspaceTree | null {
    const accountId = this.accountContext.snapshot;
    if (accountId == null) {
      return null;
    }

    const leaf = `Workspace #${accountId}`;
    return {
      full: `Workspaces ▸ ${leaf}`,
      leaf
    };
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
