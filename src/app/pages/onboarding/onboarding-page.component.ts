import {Component, OnDestroy, ViewChild} from "@angular/core";
import {CommonModule} from "@angular/common";
import {Router} from "@angular/router";
import {catchError, finalize, of, Subject, takeUntil} from "rxjs";

import {AccountFormComponent} from "../../features/accounts";
import {ConnectionFormComponent} from "../../features/connections";
import {AccountApi, AccountConnectionApi, ApiError, EtlScenarioApi} from "../../core/api";
import {AccountCreateRequest, EtlScenarioRequest} from "../../shared/models";
import {
  AccountConnectionCreateRequest
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
  error: ApiError | null = null;
  tokenErrorMessage: string | null = null;
  statusState: "idle" | "sync" | "loading" | "ready" | "error" = "idle";
  loading = false;
  formLocked = false;
  syncMessage: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly accountApi: AccountApi,
    private readonly connectionApi: AccountConnectionApi,
    private readonly etlScenarioApi: EtlScenarioApi,
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
    if (this.syncMessage) {
      return this.syncMessage;
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
    if (!this.accountId) {
      return;
    }
    this.loading = true;
    this.statusState = "loading";
    this.etlScenarioApi.run(this.buildEtlScenarioRequest(this.accountId)).pipe(
      takeUntil(this.destroy$),
      catchError((error: ApiError) => {
        this.loading = false;
        this.error = error;
        this.statusState = "error";
        this.formLocked = false;
        return of(null);
      }),
      finalize(() => {
        if (this.statusState !== "error") {
          this.loading = false;
          this.statusState = "sync";
          this.syncMessage = "ETL сценарий запущен. Обновление может занять несколько минут.";
        }
      })
    ).subscribe();
  }

  private buildEtlScenarioRequest(accountId: number): EtlScenarioRequest {
    return {
      accountId,
      events: [
        {event: "WAREHOUSE_DICT", dateMode: "LAST_DAYS", lastDays: 30},
        {event: "CATEGORY_DICT", dateMode: "LAST_DAYS", lastDays: 30},
        {event: "TARIFF_DICT", dateMode: "LAST_DAYS", lastDays: 30},
        {event: "PRODUCT_DICT", dateMode: "LAST_DAYS", lastDays: 7},
        {event: "SALES_FACT", dateMode: "LAST_DAYS", lastDays: 7},
        {event: "INVENTORY_FACT", dateMode: "LAST_DAYS", lastDays: 7},
        {event: "FACT_FINANCE", dateMode: "LAST_DAYS", lastDays: 7}
      ]
    };
  }

  private mapErrorMessage(error: ApiError): string {
    if (error.status >= 500 || error.status === 0) {
      return "Сервис временно недоступен. Попробуйте позже.";
    }
    return "Не удалось подключиться. Проверьте токен и попробуйте снова.";
  }

  goToDashboard(): void {
    if (this.accountId != null) {
      this.router.navigateByUrl(APP_PATHS.overview(this.accountId));
    }
  }
}
