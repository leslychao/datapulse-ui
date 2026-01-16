import {Component, DestroyRef, OnInit, ViewChild, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {Router} from "@angular/router";
import {catchError, finalize, of, tap} from "rxjs";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AccountFormComponent} from "../../features/accounts";
import {ConnectionFormComponent} from "../../features/connections";
import {AccountApi, AccountConnectionApi, ApiError, EtlScenarioApi} from "../../core/api";
import {
  AccountConnection,
  AccountSummary,
  EtlScenarioEvent,
  EtlScenarioRequest
} from "../../shared/models";
import {AccountContextService} from "../../core/state";
import {AuthSessionService} from "../../core/auth";
import {APP_PATHS} from "../../core/app-paths";
import {ButtonComponent} from "../../shared/ui";

interface OnboardingStep {
  id: "account" | "connection" | "sync";
  label: string;
  description: string;
}

type StatusState = "idle" | "processing" | "success" | "error";

const SYNC_SUCCESS = "SUCCESS";
const SYNC_RUNNING = "RUNNING";
const SYNC_QUEUED = "QUEUED";

const DEFAULT_ETL_EVENTS: EtlScenarioEvent[] = [
  {event: "WAREHOUSE_DICT", dateMode: "LAST_DAYS", lastDays: 30},
  {event: "CATEGORY_DICT", dateMode: "LAST_DAYS", lastDays: 30},
  {event: "TARIFF_DICT", dateMode: "LAST_DAYS", lastDays: 30},
  {event: "PRODUCT_DICT", dateMode: "LAST_DAYS", lastDays: 7},
  {event: "SALES_FACT", dateMode: "LAST_DAYS", lastDays: 7},
  {event: "INVENTORY_FACT", dateMode: "LAST_DAYS", lastDays: 7},
  {event: "FACT_FINANCE", dateMode: "LAST_DAYS", lastDays: 7}
];

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
  connections: AccountConnection[] = [];
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
    private readonly authSession: AuthSessionService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authSession.snapshot().authenticated) {
      this.router.navigateByUrl(APP_PATHS.login, {replaceUrl: true});
      return;
    }

    this.accountApi
      .list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((accounts) => {
          if (accounts.length === 0) {
            this.resetOnboardingState();
            return;
          }

          const selectedAccountId = this.selectAccount(accounts);
          this.accountId = selectedAccountId;
          this.accountName = accounts.find((account) => account.id === selectedAccountId)?.name ?? null;
          this.loadConnections(selectedAccountId, true);
        }),
        catchError((error: ApiError) => {
          this.handleApiError(error, "Не удалось загрузить аккаунты.");
          return of([]);
        })
      )
      .subscribe();
  }

  get canSubmitAccount(): boolean {
    if (this.isProcessing) {
      return false;
    }
    if (this.accountId == null) {
      return this.accountForm?.isValid() ?? false;
    }
    if (this.isAccountNameChanged()) {
      return this.accountForm?.isValid() ?? false;
    }
    return true;
  }

  get accountActionLabel(): string {
    if (this.accountId == null) {
      return this.isProcessing ? "Создаем..." : "Создать аккаунт";
    }
    if (this.isAccountNameChanged()) {
      return this.isProcessing ? "Сохраняем..." : "Сохранить изменения";
    }
    return "Далее";
  }

  get canCreateConnection(): boolean {
    return this.accountId != null && this.connections.length === 0 && !this.isProcessing;
  }

  get canStartSync(): boolean {
    return (
      this.accountId != null &&
      this.connections.length > 0 &&
      !this.hasSuccessfulSync(this.connections) &&
      !this.hasInProgressSync(this.connections) &&
      !this.isProcessing
    );
  }

  isStepComplete(index: number): boolean {
    if (index === 0) {
      return this.accountId != null;
    }
    if (index === 1) {
      return this.connections.length > 0;
    }
    return this.hasSuccessfulSync(this.connections);
  }

  maxAvailableStep(): number {
    if (this.accountId == null) {
      return 0;
    }
    if (this.connections.length === 0) {
      return 1;
    }
    return 2;
  }

  canNavigateToStep(index: number): boolean {
    if (this.isSyncStarted()) {
      return index === this.currentStep;
    }
    return index <= this.maxAvailableStep() && !this.isProcessing;
  }

  goToStep(index: number): void {
    if (!this.canNavigateToStep(index)) {
      return;
    }
    this.currentStep = index;
    this.resetErrors();
    if (index > 0) {
      this.ensureConnectionState();
    }
  }

  submitAccount(): void {
    if (!this.canSubmitAccount) {
      return;
    }
    if (this.accountId == null) {
      this.createAccount();
      return;
    }
    if (!this.isAccountNameChanged()) {
      this.goToStep(1);
      return;
    }
    this.updateAccount();
  }

  private createAccount(): void {
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
  }

  private updateAccount(): void {
    if (this.accountId == null) {
      return;
    }
    this.resetErrors();
    const accountRequest = this.accountForm?.getRequest();
    if (!accountRequest) {
      this.setStatusState("error", "Заполните название аккаунта.");
      return;
    }
    this.setStatusState("processing", "Сохраняем изменения...");
    this.accountApi
      .update(this.accountId, accountRequest)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((account) => {
          this.accountName = account.name;
          this.currentStep = 1;
          this.setStatusState("success", "Изменения сохранены.");
        }),
        catchError((error: ApiError) => {
          this.handleApiError(error, "Не удалось сохранить изменения.");
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
        tap(() => {
          this.setStatusState("success", "Подключение создано.");
          this.loadConnections(this.accountId!, true);
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
    if (this.connections.length === 0) {
      this.setStatusState("error", "Сначала создайте подключение.");
      return;
    }
    this.resetErrors();
    this.setProcessing(true);
    const request = this.buildScenarioRequest(this.accountId);

    this.etlScenarioApi
      .run(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((response) => {
          if (response.status === 200 || response.status === 202) {
            this.router.navigateByUrl(APP_PATHS.overview(this.accountId!), {replaceUrl: true});
            return;
          }
          this.setStatusState("error", "Не удалось запустить синхронизацию.");
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

  private resetOnboardingState(): void {
    this.accountContext.clear();
    this.accountId = null;
    this.accountName = null;
    this.connections = [];
    this.currentStep = 0;
    this.setStatusState("idle", "Онбординг · не завершён");
  }

  private selectAccount(accounts: AccountSummary[]): number {
    const lastSelectedAccountId = this.accountContext.snapshot;
    const match =
      lastSelectedAccountId != null
        ? accounts.find((account) => account.id === lastSelectedAccountId)
        : null;
    const selectedAccountId = match?.id ?? accounts[0].id;
    this.accountContext.setAccountId(selectedAccountId);
    return selectedAccountId;
  }

  private loadConnections(accountId: number, allowAutoAdvance: boolean): void {
    this.connectionApi
      .list(accountId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error: ApiError) => {
          this.handleApiError(error, "Не удалось загрузить подключения.");
          return of([]);
        }),
        tap((connections) => {
          this.connections = connections;
          if (this.hasSuccessfulSync(connections)) {
            this.router.navigateByUrl(APP_PATHS.overview(accountId), {replaceUrl: true});
            return;
          }
          if (allowAutoAdvance) {
            this.currentStep = this.resolveStep(connections);
          }
        })
      )
      .subscribe();
  }

  private resolveStep(connections: AccountConnection[]): number {
    if (this.accountId == null) {
      return 0;
    }
    if (connections.length === 0) {
      return 1;
    }
    return 2;
  }

  private ensureConnectionState(): void {
    if (this.accountId == null) {
      return;
    }
    this.loadConnections(this.accountId, false);
  }

  private hasSuccessfulSync(connections: AccountConnection[]): boolean {
    return connections.some(
      (connection) => connection.active && connection.lastSyncStatus === SYNC_SUCCESS
    );
  }

  private hasInProgressSync(connections: AccountConnection[]): boolean {
    return connections.some(
      (connection) =>
        connection.active &&
        (connection.lastSyncStatus === SYNC_RUNNING || connection.lastSyncStatus === SYNC_QUEUED)
    );
  }

  private isAccountNameChanged(): boolean {
    if (!this.accountForm || this.accountId == null) {
      return false;
    }
    const currentName = this.accountForm.getCurrentName();
    const storedName = (this.accountName ?? "").trim();
    return currentName !== storedName;
  }

  private isSyncStarted(): boolean {
    return this.hasSuccessfulSync(this.connections) || this.hasInProgressSync(this.connections);
  }

  private buildScenarioRequest(accountId: number): EtlScenarioRequest {
    return {
      accountId,
      events: DEFAULT_ETL_EVENTS
    };
  }
}
