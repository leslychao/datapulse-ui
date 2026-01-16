import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {Router} from "@angular/router";
import {catchError, of} from "rxjs";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {ApiError} from "../../core/api";
import {AccountSummary} from "../../shared/models";
import {APP_PATHS} from "../../core/app-paths";
import {AccountCatalogService, AccountContextService} from "../../core/state";
import {AccountSelectListComponent} from "../../features/accounts";
import {LoaderComponent} from "../../shared/ui";

@Component({
  selector: "dp-account-select-page",
  standalone: true,
  imports: [CommonModule, AccountSelectListComponent, LoaderComponent],
  templateUrl: "./account-select-page.component.html",
  styleUrl: "./account-select-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountSelectPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  loading = true;
  error: ApiError | null = null;

  accounts: AccountSummary[] = [];

  constructor(
    private readonly accountCatalog: AccountCatalogService,
    private readonly accountContext: AccountContextService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.accountCatalog
      .load()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error: ApiError) => {
          this.error = error;
          return of([]);
        })
      )
      .subscribe((accounts) => {
        this.accounts = accounts;
        this.loading = false;
      });
  }

  selectAccount(account: AccountSummary): void {
    this.accountContext.setAccountId(account.id);
    this.router.navigateByUrl(APP_PATHS.homeSummary(account.id));
  }
}
