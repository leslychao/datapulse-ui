import {Component, OnDestroy, OnInit, ViewChild} from "@angular/core";
import {CommonModule} from "@angular/common";
import {Router} from "@angular/router";
import {catchError, EMPTY, exhaustMap, finalize, map, of, Subject, switchMap, takeUntil, tap, throwError} from "rxjs";

import {AccountFormComponent} from "../../features/accounts";
import {ConnectionFormComponent} from "../../features/connections";
import {AccountApi, AccountConnectionApi, ApiError, EtlScenarioApi} from "../../core/api";
import {AccountCreateRequest, EtlScenarioRequest} from "../../shared/models";
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
export class OnboardingPageComponent implements OnInit, OnDestroy {
  @ViewChild(AccountFormComponent) accountForm?: AccountFormComponent;
  @ViewChild(ConnectionFormComponent) connectionForm?: ConnectionFormComponent;

  accountId: number | null = null;
  connectionId: number | null = null;
  error: ApiError | null = null;
  tokenErrorMessage: string | null = null;
  statusState: "idle" | "submitting" | "syncing" | "success" | "error" = "idle";
  statusText = "Онбординг · не завершён";
  statusHint: string | null = null;
  isStatusActive = false;
  isProcessing = false;
  formLocked = false;

  private readonly start$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly accountApi: AccountApi,
    private readonly connectionApi: AccountConnectionApi,
    private readonly etlScenarioApi: EtlScenarioApi,
    private readonly accountContext: AccountContextService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.accountId = this.accountContext.snapshot;
    this.start$
      .pipe(exhaustMap(() => this.runOnboarding()), takeUntil(this.destroy$))
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  startOnboarding(): void {
    this.start$.next();
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

  private runOnboarding() {
    this.resetErrors();
    const validationResult = this.validateForms();
    if (!validationResult) {
      return EMPTY;
    }

    this.setStatusState("submitting");

    const accountId$ = this.accountId
      ? of(this.accountId)
      : this.accountApi.create(validationResult.accountRequest!).pipe(
        tap((account) => {
          this.accountId = account.id;
          this.accountContext.setAccountId(account.id);
        }),
        map((account) => account.id)
      );

    return accountId$.pipe(
      switchMap((accountId) => this.createConnection(accountId)),
      switchMap((accountId) => this.startSync(accountId)),
      tap((accountId) => {
        this.setStatusState("success");
        this.router.navigateByUrl(APP_PATHS.overview(accountId));
      }),
      catchError((error: ApiError) => {
        this.handleApiError(error);
        return EMPTY;
      }),
      finalize(() => {
        this.isProcessing = false;
        this.formLocked = false;
      })
    );
  }

  private createConnection(accountId: number) {
    const request = this.connectionForm?.getRequest(accountId);
    if (!request) {
      return this.validationError("Заполните данные подключения.");
    }

    return this.connectionApi.create(request).pipe(
      tap((connection) => {
        this.connectionId = connection.id;
      }),
      map(() => accountId),
      catchError((error: ApiError) => {
        this.tokenErrorMessage = this.mapErrorMessage(error);
        return throwError(() => error);
      })
    );
  }

  private startSync(accountId: number) {
    this.setStatusState("syncing", "ETL сценарий запущен. Обновление может занять несколько минут.");
    return this.etlScenarioApi.run(this.buildEtlScenarioRequest(accountId)).pipe(map(() => accountId));
  }

  private setStatusState(state: "idle" | "submitting" | "syncing" | "success" | "error", hint: string | null = null) {
    this.statusState = state;
    this.statusText = this.resolveStatusText(state);
    this.statusHint = hint;
    this.isStatusActive = state !== "idle";
    this.isProcessing = state === "submitting" || state === "syncing";
    this.formLocked = this.isProcessing;
  }

  private resolveStatusText(state: "idle" | "submitting" | "syncing" | "success" | "error") {
    switch (state) {
      case "submitting":
        return "Подключаем...";
      case "syncing":
        return "Синхронизация запущена";
      case "success":
        return "Готово";
      case "error":
        return "Ошибка подключения";
      default:
        return "Онбординг · не завершён";
    }
  }

  private validateForms(): {accountRequest?: AccountCreateRequest} | null {
    if (!this.accountId) {
      const accountRequest = this.accountForm?.getRequest();
      if (!accountRequest) {
        this.validationError("Заполните название аккаунта.");
        return null;
      }
      const connectionRequest = this.connectionForm?.getRequest(0);
      if (!connectionRequest) {
        this.validationError("Заполните данные подключения.");
        return null;
      }
      return {accountRequest};
    }

    const connectionRequest = this.connectionForm?.getRequest(this.accountId);
    if (!connectionRequest) {
      this.validationError("Заполните данные подключения.");
      return null;
    }

    return {};
  }

  private validationError(message: string) {
    this.setStatusState("error", message);
    this.isProcessing = false;
    this.formLocked = false;
    return EMPTY;
  }

  private handleApiError(error: ApiError) {
    this.error = error;
    this.setStatusState("error", this.mapErrorMessage(error));
  }

  private resetErrors() {
    this.error = null;
    this.tokenErrorMessage = null;
    if (this.statusState === "error") {
      this.setStatusState("idle");
    }
  }

  private mapErrorMessage(error: ApiError): string {
    if (error.status >= 500 || error.status === 0) {
      return "Сервис временно недоступен. Попробуйте позже.";
    }
    return "Не удалось подключиться. Проверьте токен и попробуйте снова.";
  }
}
