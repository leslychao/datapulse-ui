import {ChangeDetectionStrategy, Component, DestroyRef, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {tap} from "rxjs/operators";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AuthUserService} from "../../core/auth";
import {AccountContextService} from "../../core/state";
import {accountIdFromRoute} from "../../core/routing/account-id.util";
import {LoadingStateComponent, PageHeaderComponent, PageLayoutComponent} from "../../shared/ui";

@Component({
  selector: "dp-profile-page",
  standalone: true,
  imports: [CommonModule, PageLayoutComponent, PageHeaderComponent, LoadingStateComponent],
  templateUrl: "./profile-page.component.html",
  styleUrl: "./profile-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePageComponent {
  private readonly authUser = inject(AuthUserService);
  private readonly accountContext = inject(AccountContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile$ = this.authUser.userProfile$;
  readonly accountId$ = accountIdFromRoute(this.route);

  constructor() {
    this.accountId$
      .pipe(
        tap((accountId) => {
          if (accountId != null && this.accountContext.snapshot !== accountId) {
            this.accountContext.setAccountId(accountId);
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  getInitial(profile: {fullName?: string | null; username?: string | null; email?: string | null}): string {
    const source = profile.fullName || profile.username || profile.email || "U";
    return source.trim().charAt(0).toUpperCase() || "U";
  }
}
