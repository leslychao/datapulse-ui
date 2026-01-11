import {Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {Router} from "@angular/router";
import {catchError, of, shareReplay} from "rxjs";

import {AccountApi} from "../../api/accounts/account.api";
import {AccountSummary} from "../../models/account.model";
import {APP_PATHS} from "../../core/app-paths";
import {AccountContextService} from "../../core/account/account-context.service";
import {ApiError} from "../../core/api/api-error.model";
import {AccountSelectListComponent} from "./account-select-list.component";

@Component({
  selector: "dp-account-select-page",
  standalone: true,
  imports: [CommonModule, AccountSelectListComponent],
  templateUrl: "./account-select-page.component.html",
  styleUrl: "./account-select-page.component.css"
})
export class AccountSelectPageComponent implements OnInit {
  accounts$ = of<AccountSummary[]>([]);
  loading = true;
  error: ApiError | null = null;

  accounts: AccountSummary[] = [];

  constructor(
    private readonly accountApi: AccountApi,
    private readonly accountContext: AccountContextService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.accounts$ = this.accountApi.list().pipe(
      shareReplay({bufferSize: 1, refCount: true})
    );

    this.accounts$
      .pipe(
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

  startOnboarding(): void {
    this.accountContext.clear();
    this.router.navigateByUrl(APP_PATHS.onboarding);
  }

  selectAccount(account: AccountSummary): void {
    this.accountContext.setAccountId(account.id);
    this.router.navigateByUrl(APP_PATHS.dashboard(account.id));
  }
}
