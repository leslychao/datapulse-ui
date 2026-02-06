import {CommonModule} from "@angular/common";
import {HttpResponse} from "@angular/common/http";
import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, inject} from "@angular/core";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {Router} from "@angular/router";
import {catchError, finalize, of, tap} from "rxjs";

import {AccountFormComponent} from "../../features/accounts/account-form.component";
import {ConnectionFormComponent} from "../../features/connections";
import {InviteMemberModalComponent, InviteMemberPayload} from "../../features/members";
import {
  AccountConnectionsApiClient,
  AccountMembersApiClient,
  AccountsApiClient,
  ApiError,
  EtlScenarioApi
} from "../../core/api";
import {APP_PATHS} from "../../core/app-paths";
import {
  AccountCatalogService,
  AccountContextService,
  OnboardingState,
  OnboardingStateService,
  OnboardingStatusState
} from "../../core/state";
import {
  AccountConnection,
  AccountConnectionSyncStatus,
  AccountMember,
  AccountMemberStatus,
  EtlScenarioEvent,
  EtlScenarioRequest
} from "../../shared/models";
import {
  ButtonComponent,
  ErrorStateComponent,
  ModalComponent,
  PageHeaderComponent,
  ToastService
} from "../../shared/ui";

type OnboardingStepId = "account" | "connection" | "invite" | "sync";
type OnboardingStepStatus = "pending" | "active" | "done" | "skipped";
type OnboardingStepActionHandler = "account" | "connection" | "invite" | "skipInvite" | "sync";

interface OnboardingStepAction {
  label: string;
  variant: "primary" | "secondary" | "link";
  handler: OnboardingStepActionHandler;
  disabled?: boolean;
}

interface OnboardingStep {
  id: OnboardingStepId;
  label: string;
  description: string;
  optional?: boolean;
}

interface OnboardingStepState extends OnboardingStep {
  status: OnboardingStepStatus;
  action?: OnboardingStepAction;
  secondaryAction?: OnboardingStepAction;
}

interface OnboardingFlowState {
  steps: OnboardingStepState[];
  activeStepId: OnboardingStepId | null;
  isLocked: boolean;
}

const SYNC_SUCCESS = AccountConnectionSyncStatus.Success;

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
  selector: "dp-getting-started-page",
  standalone: true,
  imports: [
    CommonModule,
    AccountFormComponent,
    ConnectionFormComponent,
    InviteMemberModalComponent,
    ButtonComponent,
    ModalComponent,
    ErrorStateComponent,
    PageHeaderComponent
  ],
  templateUrl: "./getting-started-page.component.html",
  styleUrl: "./getting-started-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GettingStartedPageComponent implements OnInit {
  @ViewChild(AccountFormComponent) accountForm?: AccountFormComponent;
  @ViewChild(ConnectionFormComponent) connectionForm?: ConnectionFormComponent;

  readonly steps: OnboardingStep[] = [
    {id: "account", label: "Create workspace", description: "Создайте рабочую область для подключения данных."},
    {id: "connection", label: "Create connection", description: "Подключите маркетплейс к созданному workspace."},
    {id: "invite", label: "Invite teammates", description: "Пригласите коллег для совместной работы.", optional: true},
    {
      id: "sync",
      label: "Run first sync",
      description: "Запустите синхронизацию ALL_EVENTS, чтобы данные начали поступать в аналитику."
    }
  ];

  accountModalVisible = false;
  connectionModalVisible = false;
  inviteModalVisible = false;

  syncError: ApiError | null = null;
  inviteSaving = false;
  private invitedMembers: AccountMember[] = [];

  private readonly destroyRef = inject(DestroyRef);
  private readonly onboardingState = inject(OnboardingStateService);

  private get snapshot(): OnboardingState {
    return this.onboardingState.state();
  }

  private patchState(partial: Partial<OnboardingState>): void {
    this.onboardingState.patch(partial);
  }

  get accountId(): number | null {
    return this.snapshot.accountId;
  }

  set accountId(value: number | null) {
    this.patchState({accountId: value});
  }

  get accountName(): string | null {
    return this.snapshot.accountName;
  }

  set accountName(value: string | null) {
    this.patchState({accountName: value});
  }

  get connections(): AccountConnection[] {
    return this.snapshot.connections;
  }

  set connections(value: AccountConnection[]) {
    this.patchState({connections: value});
  }

  get error(): ApiError | null {
    return this.snapshot.error;
  }

  set error(value: ApiError | null) {
    this.patchState({error: value});
  }

  get tokenErrorMessage(): string | null {
    return this.snapshot.tokenErrorMessage;
  }

  set tokenErrorMessage(value: string | null) {
    this.patchState({tokenErrorMessage: value});
  }

  get inviteCompleted(): boolean {
    return this.snapshot.inviteCompleted;
  }

  set inviteCompleted(value: boolean) {
    this.patchState({inviteCompleted: value});
  }

  get inviteSkipped(): boolean {
    return this.snapshot.inviteSkipped;
  }

  set inviteSkipped(value: boolean) {
    this.patchState({inviteSkipped: value});
  }

  get statusState(): OnboardingStatusState {
    return this.snapshot.statusState;
  }

  set statusState(value: OnboardingStatusState) {
    this.patchState({statusState: value});
  }

  get statusText(): string {
    return this.snapshot.statusText;
  }

  set statusText(value: string) {
    this.patchState({statusText: value});
  }

  get statusHint(): string | null {
    return this.snapshot.statusHint;
  }

  set statusHint(value: string | null) {
    this.patchState({statusHint: value});
  }

  get isStatusActive(): boolean {
    return this.snapshot.isStatusActive;
  }

  set isStatusActive(value: boolean) {
    this.patchState({isStatusActive: value});
  }

  get isProcessing(): boolean {
    return this.snapshot.isProcessing;
  }

  set isProcessing(value: boolean) {
    this.patchState({isProcessing: value});
  }

  get formLocked(): boolean {
    return this.snapshot.formLocked;
  }

  set formLocked(value: boolean) {
    this.patchState({formLocked: value});
  }

  constructor(
    private readonly accountApi: AccountsApiClient,
    private readonly connectionApi: AccountConnectionsApiClient,
    private readonly membersApi: AccountMembersApiClient,
    private readonly etlScenarioApi: EtlScenarioApi,
    private readonly accountContext: AccountContextService,
    private readonly accountCatalog: AccountCatalogService,
    private readonly router: Router,
    private readonly toastService: ToastService
  ) {}

  ngOnInit(): void {
    if (this.accountId != null) {
      this.loadConnections(this.accountId);
    }
  }

  private get isAnyModalOpen(): boolean {
    return this.accountModalVisible || this.connectionModalVisible || this.inviteModalVisible;
  }

  get isShellLocked(): boolean {
    return this.isProcessing || this.inviteSaving || this.isAnyModalOpen;
  }

  get isSubmitLocked(): boolean {
    return this.isProcessing || this.inviteSaving;
  }

  get isAccountReady(): boolean {
    return this.accountId != null;
  }

  get isConnectionReady(): boolean {
    return this.connections.length > 0;
  }

  get canCreateConnection(): boolean {
    return this.accountId != null && !this.isConnectionReady && !this.isSubmitLocked;
  }

  get isInviteResolved(): boolean {
    return this.inviteCompleted || this.inviteSkipped;
  }

  /**
   * ВАЖНО: New = “ещё не синхронизировали”, это НЕ “in progress”.
   * Поэтому “Run first sync” должен быть доступен при New.
   */
  get canStartSync(): boolean {
    return (
      this.accountId != null &&
      this.isConnectionReady &&
      this.isInviteResolved &&
      !this.hasSuccessfulSync(this.connections) &&
      !this.isProcessing
    );
  }

  get flowState(): OnboardingFlowState {
    return this.buildFlowState();
  }

  openAccountModal(): void {
    if (this.isAccountReady || this.isSubmitLocked || this.isAnyModalOpen) {
      return;
    }
    this.accountModalVisible = true;
  }

  closeAccountModal(): void {
    if (this.isProcessing) {
      return;
    }
    this.accountModalVisible = false;
  }

  openConnectionModal(): void {
    if (!this.canCreateConnection || this.isAnyModalOpen) {
      return;
    }
    this.connectionModalVisible = true;
  }

  closeConnectionModal(): void {
    if (this.isProcessing) {
      return;
    }
    this.connectionModalVisible = false;
  }

  openInviteModal(): void {
    if (!this.canInviteMembers() || this.isAnyModalOpen) {
      return;
    }
    this.inviteModalVisible = true;
  }

  closeInviteModal(): void {
    if (this.inviteSaving) {
      return;
    }
    this.inviteModalVisible = false;
  }

  createAccount(): void {
    if (this.isSubmitLocked) {
      return;
    }

    this.resetErrors();

    const accountRequest = this.accountForm?.getRequest();
    if (!accountRequest) {
      this.setStatusState("error", "Введите название workspace.");
      return;
    }

    this.setStatusState("processing", "Создаем workspace...");

    this.accountApi
    .create(accountRequest)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((account) => {
        this.accountId = account.id;
        this.accountName = account.name;

        this.inviteCompleted = false;
        this.inviteSkipped = false;
        this.invitedMembers = [];

        this.accountContext.setAccountId(account.id);
        this.accountCatalog.upsertAccount(account);

        this.accountModalVisible = false;
        this.setStatusState("success", "Workspace создан.");
      }),
      catchError((apiError: ApiError) => {
        this.handleApiError(apiError, "Не удалось создать workspace.");
        return of(null);
      }),
      finalize(() => this.setProcessing(false))
    )
    .subscribe();
  }

  createConnection(): void {
    if (this.isSubmitLocked) {
      return;
    }

    if (this.accountId == null) {
      this.setStatusState("error", "Сначала создайте workspace.");
      return;
    }

    this.resetErrors();

    const request = this.connectionForm?.getRequest();
    if (!request) {
      this.setStatusState("error", "Заполните данные подключения.");
      return;
    }

    this.setStatusState("processing", "Создаем подключение...");

    this.connectionApi
    .create(this.accountId, request)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        this.setStatusState("success", "Подключение создано.");
        this.connectionModalVisible = false;
        this.loadConnections(this.accountId!);
      }),
      catchError((apiError: ApiError) => {
        this.tokenErrorMessage = this.mapErrorMessage(apiError);
        this.handleApiError(apiError, "Не удалось создать подключение.");
        return of(null);
      }),
      finalize(() => this.setProcessing(false))
    )
    .subscribe();
  }

  skipInvite(): void {
    if (!this.canInviteMembers() || this.isSubmitLocked) {
      return;
    }
    this.inviteSkipped = true;
    this.inviteCompleted = false;
  }

  submitInvite(payload: InviteMemberPayload): void {
    if (this.accountId == null || this.inviteSaving) {
      return;
    }

    this.inviteSaving = true;

    const request = {
      email: payload.email,
      role: payload.role,
      status: AccountMemberStatus.Invited
    };

    this.membersApi
    .create(this.accountId, request)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((member) => {
        this.invitedMembers = [...this.invitedMembers, member];

        this.inviteCompleted = true;
        this.inviteSkipped = false;
        this.inviteModalVisible = false;

        this.toastService.success("Инвайт отправлен.");
      }),
      catchError((apiError: ApiError) => {
        this.toastService.error("Не удалось отправить инвайт.", {
          details: apiError.details,
          correlationId: apiError.correlationId
        });
        return of(null);
      }),
      finalize(() => {
        this.inviteSaving = false;
      })
    )
    .subscribe();
  }

  /**
   * Должно:
   * 1) вызвать EtlScenarioApi.run(request) согласно контракту,
   * 2) после 200/202 — редирект на analytics overview.
   */
  startSync(): void {
    if (this.accountId == null) {
      this.setStatusState("error", "Создайте workspace, чтобы запустить синхронизацию.");
      return;
    }
    if (!this.isConnectionReady) {
      this.setStatusState("error", "Сначала создайте подключение.");
      return;
    }
    if (!this.isInviteResolved) {
      this.setStatusState("error", "Завершите шаг с приглашением команды или пропустите его.");
      return;
    }
    if (!this.canStartSync) {
      this.setStatusState("error", "Сейчас синхронизацию запустить нельзя.");
      return;
    }

    this.syncError = null;
    this.resetErrors();
    this.setProcessing(true);

    const request = this.buildScenarioRequest(this.accountId);

    this.etlScenarioApi
    .run(request)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((response: HttpResponse<unknown>) => {
        if (response.status === 200 || response.status === 202) {
          this.setStatusState("success", "Sync started");
          this.router.navigateByUrl(APP_PATHS.overview(this.accountId!), {replaceUrl: true});
          return;
        }
        this.setStatusState("error", "Не удалось запустить синхронизацию.");
      }),
      catchError((apiError: ApiError) => {
        this.syncError = apiError;
        this.handleApiError(apiError, "Не удалось запустить синхронизацию.");
        return of(null);
      }),
      finalize(() => this.setProcessing(false))
    )
    .subscribe();
  }

  get existingMembers(): AccountMember[] {
    return this.invitedMembers;
  }

  handleAction(action: OnboardingStepAction): void {
    if (action.disabled) {
      return;
    }
    switch (action.handler) {
      case "account":
        this.openAccountModal();
        break;
      case "connection":
        this.openConnectionModal();
        break;
      case "invite":
        this.openInviteModal();
        break;
      case "skipInvite":
        this.skipInvite();
        break;
      case "sync":
        this.startSync();
        break;
      default:
        break;
    }
  }

  private setStatusState(state: OnboardingStatusState, text: string, hint: string | null = null): void {
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

  private handleApiError(apiError: ApiError, fallbackMessage: string): void {
    this.error = apiError;
    this.setStatusState("error", apiError.message || fallbackMessage);
  }

  private resetErrors(): void {
    this.error = null;
    this.tokenErrorMessage = null;
    if (this.statusState === "error") {
      this.onboardingState.resetStatus();
    }
  }

  private mapErrorMessage(apiError: ApiError): string {
    return apiError.message;
  }

  private loadConnections(accountId: number): void {
    this.connectionApi
    .list(accountId)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError((apiError: ApiError) => {
        this.handleApiError(apiError, "Не удалось загрузить подключения.");
        return of([] as AccountConnection[]);
      }),
      tap((connections) => {
        this.connections = connections;
      })
    )
    .subscribe();
  }

  private hasSuccessfulSync(connections: AccountConnection[]): boolean {
    return connections.some((connection) => connection.active && connection.lastSyncStatus === SYNC_SUCCESS);
  }

  private buildScenarioRequest(accountId: number): EtlScenarioRequest {
    return {accountId, events: DEFAULT_ETL_EVENTS};
  }

  private canInviteMembers(): boolean {
    return this.isConnectionReady && !this.isInviteResolved && !this.isSubmitLocked;
  }

  private buildFlowState(): OnboardingFlowState {
    const accountDone = this.isAccountReady;
    const connectionDone = this.isConnectionReady;

    const inviteDone = this.inviteCompleted;
    const inviteWasSkipped = this.inviteSkipped;
    const inviteResolved = inviteDone || inviteWasSkipped;

    const syncDone = this.hasSuccessfulSync(this.connections);

    const activeStepId: OnboardingStepId | null =
      !accountDone
        ? "account"
        : !connectionDone
          ? "connection"
          : !inviteResolved
            ? "invite"
            : !syncDone
              ? "sync"
              : null;

    const steps: OnboardingStepState[] = [
      {
        ...this.steps[0],
        status: accountDone ? "done" : "active",
        action: accountDone
          ? undefined
          : {label: "Create workspace", variant: "primary", handler: "account", disabled: this.isShellLocked}
      },
      {
        ...this.steps[1],
        status: connectionDone ? "done" : accountDone ? "active" : "pending",
        action:
          accountDone && !connectionDone
            ? {label: "Create connection", variant: "primary", handler: "connection", disabled: this.isShellLocked}
            : undefined
      },
      {
        ...this.steps[2],
        status: inviteDone ? "done" : inviteWasSkipped ? "skipped" : connectionDone ? "active" : "pending",
        action:
          connectionDone && !inviteResolved
            ? {label: "Invite teammates", variant: "secondary", handler: "invite", disabled: this.isShellLocked}
            : undefined,
        secondaryAction:
          connectionDone && !inviteResolved
            ? {label: "Skip", variant: "link", handler: "skipInvite", disabled: this.isShellLocked}
            : undefined
      },
      {
        ...this.steps[3],
        status: syncDone ? "done" : inviteResolved && connectionDone ? "active" : "pending",
        action:
          inviteResolved && connectionDone && !syncDone
            ? {label: "Run first sync", variant: "primary", handler: "sync", disabled: !this.canStartSync || this.isShellLocked}
            : undefined
      }
    ];

    return {steps, activeStepId, isLocked: this.isShellLocked};
  }
}
