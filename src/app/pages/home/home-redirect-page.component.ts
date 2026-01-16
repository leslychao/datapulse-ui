import {Component, DestroyRef, OnInit, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {Router} from "@angular/router";
import {catchError, of} from "rxjs";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AccountApi} from "../../core/api";
import {AuthSessionService} from "../../core/auth";
import {AccountContextService} from "../../core/state";
import {APP_PATHS} from "../../core/app-paths";
import {LoaderComponent} from "../../shared/ui";

@Component({
  selector: "dp-home-redirect-page",
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  templateUrl: "./home-redirect-page.component.html",
  styleUrl: "./home-redirect-page.component.css"
})
export class HomeRedirectPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly accountApi: AccountApi,
    private readonly accountContext: AccountContextService,
    private readonly authSession: AuthSessionService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authSession.snapshot().authenticated) {
      this.router.navigateByUrl(APP_PATHS.login, {replaceUrl: true});
      return;
    }

    const lastSelectedAccountId = this.accountContext.snapshot;
    this.accountApi
      .list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([]))
      )
      .subscribe((accounts) => {
        if (accounts.length === 0) {
          this.accountContext.clear();
          this.router.navigateByUrl(APP_PATHS.onboarding, {replaceUrl: true});
          return;
        }

        if (lastSelectedAccountId != null) {
          const hasSelectedAccount = accounts.some((account) => account.id === lastSelectedAccountId);
          if (hasSelectedAccount) {
            this.router.navigateByUrl(APP_PATHS.overview(lastSelectedAccountId), {replaceUrl: true});
            return;
          }
          this.accountContext.clear();
        }

        this.router.navigateByUrl(APP_PATHS.selectAccount, {replaceUrl: true});
      });
  }
}
