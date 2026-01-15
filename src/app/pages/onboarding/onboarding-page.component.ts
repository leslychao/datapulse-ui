import {Component, DestroyRef, OnInit, ViewChild, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {Router} from "@angular/router";
import {catchError, filter, finalize, of, switchMap, take, tap, timer} from "rxjs";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AccountFormComponent} from "../../features/accounts";
import {ConnectionFormComponent} from "../../features/connections";
import {AccountApi, AccountConnectionApi, ApiError} from "../../core/api";
import {AccountConnection, AccountConnectionSyncStatusType} from "../../shared/models";
import {AccountContextService} from "../../core/state";
import {APP_PATHS} from "../../core/app-paths";
import {ButtonComponent} from "../../shared/ui";

interface OnboardingStep {
  id: "account" | "connection" | "sync";
  label: string;
  description: string;
}

type StatusState = "idle" | "processing" | "success" | "error";

const ONBOARDING_ACTIVE_KEY = "datapulse.onboarding.active";

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
  accountName: string | null = null;
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
    private readonly accountContext: AccountContextService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const lastSelectedAccountId = this.accountContext.snapshot;
    this.accountApi
      .list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((accounts) => {
          if (accounts.length === 0) {
            this.setOnboardingActive(true);
            this.accountContext.clear();
            this.accountId = null;
            this.accountName = null;
            this.connectionId = null;
            this.currentStep = 0;
            return;
          }

          if (!this.isOnboardingActive()) {
            this.router.navigateByUrl(APP_PATHS.selectAccount, {replaceUrl: true});
            return;
          }

          if (lastSelectedAccountId == null) {
            this.clearOnboardingState();
            this.router.navigateByUrl(APP_PATHS.selectAccount, {replaceUrl: true});
            return;
          }

          const accountExists = accounts.some((account) => account.id === lastSelectedAccountId);
          if (!accountExists) {
            this.clearOnboardingState();
            this.router.navigateByUrl(APP_PATHS.selectAccount, {replaceUrl: true});
            return;
          }

          this.accountId = lastSelectedAccountId;
          this.loadAccountName(lastSelectedAccountId);
          this.loadConnections(lastSelectedAccountId, true);
        }),
        catchError((error: ApiError) => {
          this.handleApiError(error, "Не удалось загрузить аккаунты.");
          return of([]);
        })
      )
      .subscribe();
  }

  get canSaveAccount(): boolean {
    return !this.isProcessing;
  }

  get canCreateConnection(): boolean {
    return this.accountId != null && this.connectionId == null && !this.isProcessing;
  }

  get canStartSync(): boolean {
    return this.accountId != null && this.connectionId != null && !this.isProcessing;
  }

  isStepComplete(index: number): boolean {
    if (index === 0) {
      return this.accountId != null;
    }
    if (index === 1) {
      return this.connectionId != null;
    }
    return false;
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
    if (index === 0 && this.accountId != null && this.accountName == null) {
      this.loadAccountName(this.accountId);
    }
    if (index >= 1) {
      this.ensureConnectionState();
    }
  }

  saveAccount(): void {
    if (!this.canSaveAccount) {
      return;
    }
    this.resetErrors();
    const accountRequest = this.accountForm?.getRequest();
    if (!accountRequest) {
      this.setStatusState("error", "Заполните название аккаунта.");
      return;
    }
    if (this.accountId == null) {
      this.setStatusState("processing", "Создаем аккаунт...");
      this.accountApi
        .create(accountRequest)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap((account) => {
            this.accountId = account.id;
            this.accountName = account.name;
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
      return;
    }
    this.setStatusState("processing", "Обновляем аккаунт...");
    this.accountApi
      .update(this.accountId, accountRequest)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((account) => {
          this.accountName = account.name;
          this.setStatusState("success", "Аккаунт обновлен.");
        }),
        catchError((error: ApiError) => {
          this.handleApiError(error, "Не удалось обновить аккаунт.");
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
    if (this.accountId == null) {
      this.setStatusState("error", "Создайте аккаунт, чтобы запустить синхронизацию.");
      return;
    }
    this.resetErrors();
    this.setStatusState(
      "processing",
      "Синхронизация запущена",
      "Идёт первичная синхронизация. Это может занять несколько минут."
    );
    this.ensureConnectionId()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((connectionId) => {
          if (connectionId == null) {
            this.setStatusState("error", "Сначала создайте подключение.");
            return of(null);
          }
          return this.connectionApi
            .sync(connectionId)
            .pipe(switchMap(() => this.pollSyncStatus(connectionId)));
        }),
        tap((status) => {
          if (!status) {
            return;
          }
          if (status.status === AccountConnectionSyncStatusType.Failed) {
            const message = status.message || "Синхронизация завершилась ошибкой.";
            this.setStatusState("error", message);
            return;
          }
          this.setStatusState("success", "Синхронизация завершена.");
          this.accountContext.setAccountId(this.accountId!);
          this.clearOnboardingState();
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
    this.setStatusState("error", error.message || fallbackMessage);
  }

  private resetErrors(): void {
    this.error = null;
    this.tokenErrorMessage = null;
    if (this.statusState === "error") {
      this.setStatusState("idle", "Онбординг · не завершён");
    }
  }

  private mapErrorMessage(error: ApiError): string {
    return error.message;
  }

  private loadAccountName(accountId: number): void {
    this.accountApi
      .list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((accounts) => {
          const account = accounts.find((item) => item.id === accountId);
          if (account) {
            this.accountName = account.name;
          }
        }),
        catchError(() => {
          return of([]);
        })
      )
      .subscribe();
  }

  private loadConnections(accountId: number, allowAutoAdvance: boolean): void {
    this.connectionApi
      .list(accountId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([])),
        tap((connections) => {
          const selectedConnection = this.pickConnection(connections);
          this.connectionId = selectedConnection?.id ?? null;
          if (allowAutoAdvance) {
            this.currentStep = this.maxAvailableStep();
            return;
          }
          this.currentStep = Math.min(this.currentStep, this.maxAvailableStep());
        })
      )
      .subscribe();
  }

  private pickConnection(connections: AccountConnection[]): AccountConnection | null {
    if (!connections.length) {
      return null;
    }
    return connections.find((connection) => connection.active) ?? connections[0];
  }

  private pollSyncStatus(connectionId: number) {
    return timer(0, 4000).pipe(
      switchMap(() => this.connectionApi.syncStatus(connectionId)),
      filter(
        (status) =>
          status.status === AccountConnectionSyncStatusType.Completed ||
          status.status === AccountConnectionSyncStatusType.Failed
      ),
      take(1)
    );
  }

  private ensureConnectionState(): void {
    if (this.accountId == null) {
      return;
    }
    this.loadConnections(this.accountId, false);
  }

  private ensureConnectionId() {
    if (this.connectionId != null) {
      return of(this.connectionId);
    }
    if (this.accountId == null) {
      return of(null);
    }
    return this.connectionApi.list(this.accountId).pipe(
      tap((connections) => {
        const selectedConnection = this.pickConnection(connections);
        this.connectionId = selectedConnection?.id ?? null;
      }),
      switchMap(() => of(this.connectionId)),
      catchError(() => of(null))
    );
  }

  private isOnboardingActive(): boolean {
    return localStorage.getItem(ONBOARDING_ACTIVE_KEY) === "true";
  }

  private setOnboardingActive(isActive: boolean): void {
    localStorage.setItem(ONBOARDING_ACTIVE_KEY, isActive ? "true" : "false");
  }

  private clearOnboardingState(): void {
    localStorage.removeItem(ONBOARDING_ACTIVE_KEY);
  }
}
