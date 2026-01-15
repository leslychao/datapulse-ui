import {Component, DestroyRef, OnInit, ViewChild, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {Router} from "@angular/router";
import {catchError, finalize, of, tap} from "rxjs";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AccountFormComponent} from "../../features/accounts";
import {ConnectionFormComponent} from "../../features/connections";
import {AccountApi, AccountConnectionApi, ApiError, EtlScenarioApi} from "../../core/api";
import {EtlScenarioRequest} from "../../shared/models";
import {AccountContextService} from "../../core/state";
import {APP_PATHS} from "../../core/app-paths";
import {ButtonComponent} from "../../shared/ui";

interface OnboardingStep {
  id: "account" | "connection" | "sync";
  label: string;
  description: string;
}

type StatusState = "idle" | "processing" | "success" | "error";

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
export class OnboardingPageComponent implements OnInit {
  @ViewChild(AccountFormComponent) accountForm?: AccountFormComponent;
  @ViewChild(ConnectionFormComponent) connectionForm?: ConnectionFormComponent;

  readonly steps: OnboardingStep[] = [
    {
      id: "account",
      label: "Аккаунт",
      description: "Создайте рабочую область для подключения данных."
    },
    {
      id: "connection",
      label: "Подключение",
      description: "Подключите маркетплейс к созданному аккаунту."
    },
    {
      id: "sync",
      label: "Синхронизация",
      description: "Запустите первую синхронизацию данных."
    }
  ];

  currentStep = 0;
  accountId: number | null = null;
  connectionId: number | null = null;
  error: ApiError | null = null;
  tokenErrorMessage: string | null = null;

  statusState: StatusState = "idle";
  statusText = "Онбординг · не завершён";
  statusHint: string | null = null;
  isStatusActive = false;
  isProcessing = false;
  formLocked = false;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly accountApi: AccountApi,
    private readonly connectionApi: AccountConnectionApi,
    private readonly etlScenarioApi: EtlScenarioApi,
    private readonly accountContext: AccountContextService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.accountId = this.accountContext.snapshot;
    if (this.accountId != null) {
      this.currentStep = 1;
    }
  }

  get canCreateAccount(): boolean {
    return this.accountId == null && !this.isProcessing;
  }

  get canCreateConnection(): boolean {
    return this.accountId != null && this.connectionId == null && !this.isProcessing;
  }

  get canStartSync(): boolean {
    return this.accountId != null && this.connectionId != null && !this.isProcessing;
  }

  maxAvailableStep(): number {
    if (this.connectionId != null) {
      return 2;
    }
    if (this.accountId != null) {
      return 1;
    }
    return 0;
  }

  canNavigateToStep(index: number): boolean {
    return index <= this.maxAvailableStep() && !this.isProcessing;
  }

  goToStep(index: number): void {
    if (!this.canNavigateToStep(index)) {
      return;
    }
    this.currentStep = index;
    this.resetErrors();
  }

  createAccount(): void {
    if (!this.canCreateAccount) {
      return;
    }
    this.resetErrors();
    const accountRequest = this.accountForm?.getRequest();
    if (!accountRequest) {
      this.setStatusState("error", "Заполните название аккаунта.");
      return;
    }
    this.setStatusState("processing", "Создаем аккаунт...");
    this.accountApi
      .create(accountRequest)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((account) => {
          this.accountId = account.id;
          this.accountContext.setAccountId(account.id);
          this.currentStep = 1;
          this.setStatusState("success", "Аккаунт создан.");
        }),
        catchError((error: ApiError) => {
          this.handleApiError(error, "Не удалось создать аккаунт.");
          return of(null);
        }),
        finalize(() => this.setProcessing(false))
      )
      .subscribe();
  }

  createConnection(): void {
    if (!this.canCreateConnection) {
      return;
    }
    this.resetErrors();
    if (this.accountId == null) {
      this.setStatusState("error", "Сначала создайте аккаунт.");
      return;
    }
    const request = this.connectionForm?.getRequest(this.accountId);
    if (!request) {
      this.setStatusState("error", "Заполните данные подключения.");
      return;
    }
    this.setStatusState("processing", "Создаем подключение...");
    this.connectionApi
      .create(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((connection) => {
          this.connectionId = connection.id;
          this.currentStep = 2;
          this.setStatusState("success", "Подключение создано.");
        }),
        catchError((error: ApiError) => {
          this.tokenErrorMessage = this.mapErrorMessage(error);
          this.handleApiError(error, "Не удалось создать подключение.");
          return of(null);
        }),
        finalize(() => this.setProcessing(false))
      )
      .subscribe();
  }

  startSync(): void {
    if (!this.canStartSync || this.accountId == null) {
      return;
    }
    this.resetErrors();
    this.setStatusState(
      "processing",
      "Синхронизация запущена",
      "ETL сценарий запущен. Обновление может занять несколько минут."
    );
    this.etlScenarioApi
      .run(this.buildEtlScenarioRequest(this.accountId))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          this.setStatusState("success", "Данные отправлены в обработку.");
          this.accountContext.setAccountId(this.accountId!);
          this.router.navigateByUrl(APP_PATHS.overview(this.accountId!), {replaceUrl: true});
        }),
        catchError((error: ApiError) => {
          this.handleApiError(error, "Не удалось запустить синхронизацию.");
          return of(null);
        }),
        finalize(() => this.setProcessing(false))
      )
      .subscribe();
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

  private setStatusState(state: StatusState, text: string, hint: string | null = null): void {
    this.statusState = state;
    this.statusText = text;
    this.statusHint = hint;
    this.isStatusActive = state !== "idle";
    this.setProcessing(state === "processing");
  }

  private setProcessing(isProcessing: boolean): void {
    this.isProcessing = isProcessing;
    this.formLocked = isProcessing;
  }

  private handleApiError(error: ApiError, fallbackMessage: string): void {
    this.error = error;
    this.setStatusState("error", fallbackMessage);
  }

  private resetErrors(): void {
    this.error = null;
    this.tokenErrorMessage = null;
    if (this.statusState === "error") {
      this.setStatusState("idle", "Онбординг · не завершён");
    }
  }

  private mapErrorMessage(error: ApiError): string {
    if (error.status >= 500 || error.status === 0) {
      return "Сервис временно недоступен. Попробуйте позже.";
    }
    return "Не удалось подключиться. Проверьте токен и попробуйте снова.";
  }
}
