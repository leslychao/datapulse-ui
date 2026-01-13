import {Component, OnDestroy, ViewChild} from "@angular/core";
import {CommonModule} from "@angular/common";
import {Router} from "@angular/router";
import {catchError, interval, of, Subject, switchMap, takeUntil, tap} from "rxjs";

import {AccountFormComponent} from "../../features/accounts";
import {ConnectionFormComponent} from "../../features/connections";
import {AccountApi, AccountConnectionApi, ApiError} from "../../core/api";
import {AccountCreateRequest} from "../../shared/models";
import {
  AccountConnectionCreateRequest,
  AccountConnectionSyncStatus,
  AccountConnectionSyncStatusType
} from "../../shared/models";
import {AccountContextService} from "../../core/state";
import {APP_PATHS} from "../../core/app-paths";
import {ButtonComponent} from "../../shared/ui";

@Component({
  selector: "dp-onboarding-page",
  standalone: true,
  imports: [
    CommonModule,
    AccountFormComponent,
    ConnectionFormComponent,
    ButtonComponent
  ],
  templateUrl: "./onboarding-page.component.html",
  styleUrl: "./onboarding-page.component.css"
})
export class OnboardingPageComponent implements OnDestroy {
  @ViewChild(AccountFormComponent) accountForm?: AccountFormComponent;
  @ViewChild(ConnectionFormComponent) connectionForm?: ConnectionFormComponent;

  accountId: number | null = null;
  connectionId: number | null = null;
  syncStatus: AccountConnectionSyncStatus | null = null;
  error: ApiError | null = null;
  tokenErrorMessage: string | null = null;
  accountName = "";
  statusState: "idle" | "sync" | "loading" | "ready" | "error" = "idle";
  loading = false;
  formLocked = false;

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

  get statusText(): string {
    if (this.statusState === "error") {
      return "Ошибка подключения";
    }
    if (this.statusState === "ready") {
      return "Готово";
    }
    if (this.statusState === "loading") {
      return "Данные загружаются";
    }
    if (this.statusState === "sync") {
      return "Синхронизация запущена";
    }
    return "Онбординг · не завершён";
  }

  get statusHint(): string | null {
    if (this.statusState === "error" && this.error) {
      return this.mapErrorMessage(this.error);
    }
    if (this.syncStatus?.message) {
      return this.syncStatus.message;
    }
    return null;
  }

  get isStatusActive(): boolean {
    return this.statusState !== "idle";
  }

  startOnboarding(): void {
    if (this.loading) {
      return;
    }
    this.error = null;
    this.tokenErrorMessage = null;

    if (!this.accountId) {
      const accountRequest = this.accountForm?.getRequest();
      if (!accountRequest) {
        return;
      }
      this.accountName = accountRequest.name;
      this.formLocked = true;
      this.statusState = "sync";
      this.createAccount(accountRequest);
      return;
    }

    if (!this.connectionId) {
      this.formLocked = true;
      this.statusState = "sync";
      this.submitConnection();
    }
  }

  createAccount(request: AccountCreateRequest): void {
    this.loading = true;
    this.accountApi.create(request).subscribe({
      next: (account) => {
        this.loading = false;
        this.accountId = account.id;
        this.accountContext.setAccountId(account.id);
        this.submitConnection();
      },
      error: (error: ApiError) => {
        this.loading = false;
        this.error = error;
        this.statusState = "error";
        this.formLocked = false;
      }
    });
  }

  submitConnection(): void {
    if (!this.accountId) {
      return;
    }
    const request = this.connectionForm?.getRequest(this.accountId);
    if (!request) {
      this.formLocked = false;
      this.statusState = "idle";
      return;
    }
    this.createConnection(request);
  }

  createConnection(request: AccountConnectionCreateRequest): void {
    this.loading = true;
    this.connectionApi.create(request).subscribe({
      next: (connection) => {
        this.loading = false;
        this.connectionId = connection.id;
        this.statusState = "sync";
        this.startSync();
      },
      error: (error: ApiError) => {
        this.loading = false;
        this.error = error;
        this.statusState = "error";
        this.formLocked = false;
        this.tokenErrorMessage = this.mapErrorMessage(error);
      }
    });
  }

  startSync(): void {
    if (!this.connectionId) {
      return;
    }
    this.loading = true;
    this.connectionApi.sync(this.connectionId).pipe(
      tap((status) => {
        this.syncStatus = status;
        this.loading = false;
        this.statusState = "loading";
      }),
      switchMap(() => interval(5000)),
      switchMap(() => this.connectionApi.syncStatus(this.connectionId!)),
      takeUntil(this.destroy$),
      catchError((error: ApiError) => {
        this.error = error;
        this.statusState = "error";
        this.formLocked = false;
        return of(null);
      })
    ).subscribe((status) => {
      if (status) {
        this.syncStatus = status;
        if (status.status === AccountConnectionSyncStatusType.Queued) {
          this.statusState = "sync";
        }
        if (status.status === AccountConnectionSyncStatusType.Running) {
          this.statusState = "loading";
        }
        if (status.status === AccountConnectionSyncStatusType.Completed) {
          this.statusState = "ready";
          this.goToDashboard();
        }
        if (status.status === AccountConnectionSyncStatusType.Failed) {
          this.statusState = "error";
        }
      }
    });
  }

  private mapErrorMessage(error: ApiError): string {
    if (error.status >= 500 || error.status === 0) {
      return "Сервис временно недоступен. Попробуйте позже.";
    }
    return "Не удалось подключиться. Проверьте токен и попробуйте снова.";
  }

  goToDashboard(): void {
    if (this.accountId != null) {
      this.router.navigateByUrl(APP_PATHS.dashboard(this.accountId));
    }
  }
}
