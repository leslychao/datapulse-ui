import {ChangeDetectionStrategy, Component, DestroyRef, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {Router} from "@angular/router";
import {combineLatest} from "rxjs";
import {distinctUntilChanged, filter, map} from "rxjs/operators";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AuthRedirectService} from "../../core/auth";
import {ButtonComponent} from "../../shared/ui";
import {APP_PATHS} from "../../core/app-paths";
import {AuthSessionService} from "../../core/auth";
import {IamService} from "../../core/state";

@Component({
  selector: "dp-login-page",
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: "./login-page.component.html",
  styleUrl: "./login-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent {
  private readonly authRedirect = inject(AuthRedirectService);
  private readonly authSession = inject(AuthSessionService);
  private readonly iamService = inject(IamService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly vm$ = combineLatest({
    auth: this.authSession.state$,
    iamState: this.iamService.state$,
    iamError: this.iamService.error$
  }).pipe(
    map(({auth, iamState, iamError}) => ({
      authenticated: auth.authenticated,
      iamState,
      iamError
    }))
  );

  constructor() {
    this.authSession.state$
      .pipe(
        map((state) => state.authenticated),
        distinctUntilChanged(),
        filter((authenticated) => authenticated),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.iamService.loadProfile().subscribe();
      });

    this.iamService.state$
      .pipe(
        filter((state) => state === "READY"),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.router.navigateByUrl(APP_PATHS.workspaces, {replaceUrl: true});
      });
  }

  login(): void {
    this.authRedirect.login(APP_PATHS.workspaces);
  }

  retry(): void {
    this.iamService.loadProfile(true).subscribe();
  }

  logout(): void {
    this.authRedirect.logout();
  }
}
