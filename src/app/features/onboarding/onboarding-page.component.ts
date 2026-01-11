import {Component, OnDestroy} from "@angular/core";
import {CommonModule} from "@angular/common";
import {Router} from "@angular/router";
import {interval, Subject, switchMap, takeUntil, tap, catchError, of} from "rxjs";

import {AccountFormComponent} from "./account-form.component";
import {ConnectionFormComponent} from "./connection-form.component";
import {SyncStatusComponent} from "./sync-status.component";
import {AccountApi} from "../../api/accounts/account.api";
import {AccountConnectionApi} from "../../api/account-connections/account-connection.api";
import {AccountCreateRequest} from "../../models/account.model";
import {
  AccountConnectionCreateRequest,
  AccountConnectionSyncStatus
} from "../../models/account-connection.model";
import {AccountContextService} from "../../core/account/account-context.service";
import {ApiError} from "../../core/api/api-error.model";
import {APP_PATHS} from "../../core/app-paths";

@Component({
  selector: "dp-onboarding-page",
  standalone: true,
  imports: [CommonModule, AccountFormComponent, ConnectionFormComponent, SyncStatusComponent],
  templateUrl: "./onboarding-page.component.html",
  styleUrl: "./onboarding-page.component.css"
})
export class OnboardingPageComponent implements OnDestroy {
  step = 1;
  accountId: number | null = null;
  connectionId: number | null = null;
  syncStatus: AccountConnectionSyncStatus | null = null;
  error: ApiError | null = null;
  loading = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly accountApi: AccountApi,
    private readonly connectionApi: AccountConnectionApi,
    private readonly accountContext: AccountContextService,
    private readonly router: Router
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createAccount(request: AccountCreateRequest): void {
    this.loading = true;
    this.error = null;
    this.accountApi.create(request).subscribe({
      next: (account) => {
        this.loading = false;
        this.accountId = account.id;
        this.accountContext.setAccountId(account.id);
        this.step = 2;
      },
      error: (error: ApiError) => {
        this.loading = false;
        this.error = error;
      }
    });
  }

  createConnection(request: AccountConnectionCreateRequest): void {
    this.loading = true;
    this.error = null;
    this.connectionApi.create(request).subscribe({
      next: (connection) => {
        this.loading = false;
        this.connectionId = connection.id;
        this.step = 3;
        this.startSync();
      },
      error: (error: ApiError) => {
        this.loading = false;
        this.error = error;
      }
    });
  }

  startSync(): void {
    if (!this.connectionId) {
      return;
    }
    this.loading = true;
    this.error = null;
    this.connectionApi.sync(this.connectionId).pipe(
      tap((status) => {
        this.syncStatus = status;
        this.loading = false;
      }),
      switchMap(() => interval(5000)),
      switchMap(() => this.connectionApi.syncStatus(this.connectionId!)),
      takeUntil(this.destroy$),
      catchError((error: ApiError) => {
        this.error = error;
        return of(null);
      })
    ).subscribe((status) => {
      if (status) {
        this.syncStatus = status;
      }
    });
  }

  goToDashboard(): void {
    if (this.accountId != null) {
      this.router.navigateByUrl(APP_PATHS.dashboard(this.accountId));
    }
  }
}
