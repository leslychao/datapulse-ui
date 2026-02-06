import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {Router} from "@angular/router";
import {catchError, finalize, of, tap} from "rxjs";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AccountFormComponent} from "../../features/accounts/account-form.component";
import {ConnectionFormComponent} from "../../features/connections";
import {InviteMemberModalComponent, InviteMemberPayload} from "../../features/members";
import {
  AccountMembersApiClient,
  AccountsApiClient,
  AccountConnectionsApiClient,
  ApiError,
  EtlScenarioApi
} from "../../core/api";
import {
  AccountConnection,
  AccountConnectionSyncStatus,
  AccountMember,
  AccountMemberStatus,
  EtlScenarioEvent,
  EtlScenarioRequest
} from "../../shared/models";
import {
  AccountCatalogService,
  AccountContextService,
  OnboardingState,
  OnboardingStateService,
  OnboardingStatusState
} from "../../core/state";
import {APP_PATHS} from "../../core/app-paths";
import {
  ButtonComponent,
  ErrorStateComponent,
  ModalComponent,
  PageHeaderComponent,
  ToastService
} from "../../shared/ui";

interface OnboardingStep {
  id: "account" | "connection" | "invite";
  label: string;
  description: string;
  optional?: boolean;
}

const SYNC_SUCCESS = AccountConnectionSyncStatus.Success;
const SYNC_NEW = AccountConnectionSyncStatus.New;

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
    {
      id: "account",
      label: "Create workspace",
      description: "Создайте рабочую область для подключения данных."
    },
    {
      id: "connection",
      label: "Create connection",
      description: "Подключите маркетплейс к созданному workspace."
    },
    {
      id: "invite",
      label: "Invite teammates",
      description: "Пригласите коллег для совместной работы.",
      optional: true
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

  private get snapshot() {
    return this.onboardingState.state();
  }

  private patchState(partial: Partial<OnboardingState>): void {
    this.onboardingState.patch(partial);
  }

  get currentStep(): number {
    return this.snapshot.currentStep;
  }

  set currentStep(step: number) {
    this.patchState({currentStep: step});
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
      this.loadConnections(this.accountId, true);
    }
  }

  get isAccountReady(): boolean {
    return this.accountId != null;
  }

  get isConnectionReady(): boolean {
    return this.connections.length > 0;
  }

  get isInviteStepDone(): boolean {
    return this.inviteCompleted || this.inviteSkipped;
  }

  get canCreateConnection(): boolean {
    return this.accountId != null && !this.isProcessing && !this.isConnectionReady;
  }

  get canStartSync(): boolean {
    return (
      this.accountId != null &&
      this.isConnectionReady &&
      !this.hasSuccessfulSync(this.connections) &&
      !this.hasInProgressSync(this.connections) &&
      !this.isProcessing
    );
  }

  openAccountModal(): void {
    this.accountModalVisible = true;
  }

  closeAccountModal(): void {
    if (this.isProcessing) {
      return;
    }
    this.accountModalVisible = false;
  }

  openConnectionModal(): void {
    this.connectionModalVisible = true;
  }

  closeConnectionModal(): void {
    if (this.isProcessing) {
      return;
    }
    this.connectionModalVisible = false;
  }

  openInviteModal(): void {
    this.inviteModalVisible = true;
  }

  closeInviteModal(): void {
    if (this.inviteSaving) {
      return;
    }
    this.inviteModalVisible = false;
  }

  createAccount(): void {
    if (this.isProcessing) {
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
          this.currentStep = 1;
          this.accountModalVisible = false;
          this.setStatusState("success", "Workspace создан.");
        }),
        catchError((error: ApiError) => {
          this.handleApiError(error, "Не удалось создать workspace.");
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

  skipInvite(): void {
    if (!this.isConnectionReady) {
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
        catchError((error: ApiError) => {
          this.toastService.error("Не удалось отправить инвайт.", {
            details: error.details,
            correlationId: error.correlationId
          });
          return of(null);
        }),
        finalize(() => {
          this.inviteSaving = false;
        })
      )
      .subscribe();
  }

  startSync(): void {
    if (this.accountId == null) {
      this.setStatusState("error", "Создайте workspace, чтобы запустить синхронизацию.");
      return;
    }
    if (!this.isConnectionReady) {
      this.setStatusState("error", "Сначала создайте подключение.");
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
        tap((response) => {
          if (response.status === 200 || response.status === 202) {
            this.setStatusState("success", "Sync started");
            this.router.navigateByUrl(APP_PATHS.overview(this.accountId!), {replaceUrl: true});
            return;
          }
          this.setStatusState("error", "Не удалось запустить синхронизацию.");
        }),
        catchError((error: ApiError) => {
          this.syncError = error;
          this.handleApiError(error, "Не удалось запустить синхронизацию.");
          return of(null);
        }),
        finalize(() => this.setProcessing(false))
      )
      .subscribe();
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

  private handleApiError(error: ApiError, fallbackMessage: string): void {
    this.error = error;
    this.setStatusState("error", error.message || fallbackMessage);
  }

  private resetErrors(): void {
    this.error = null;
    this.tokenErrorMessage = null;
    if (this.statusState === "error") {
      this.onboardingState.resetStatus();
    }
  }

  private mapErrorMessage(error: ApiError): string {
    return error.message;
  }

  private loadConnections(accountId: number, allowAutoAdvance: boolean): void {
    this.connectionApi
      .list(accountId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error: ApiError) => {
          this.handleApiError(error, "Не удалось загрузить подключения.");
          return of([] as AccountConnection[]);
        }),
        tap((connections) => {
          this.connections = connections;
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

  private hasSuccessfulSync(connections: AccountConnection[]): boolean {
    return connections.some(
      (connection) => connection.active && connection.lastSyncStatus === SYNC_SUCCESS
    );
  }

  private hasInProgressSync(connections: AccountConnection[]): boolean {
    return connections.some(
      (connection) => connection.active && connection.lastSyncStatus === SYNC_NEW
    );
  }

  private buildScenarioRequest(accountId: number): EtlScenarioRequest {
    return {
      accountId,
      events: DEFAULT_ETL_EVENTS
    };
  }

  get existingMembers(): AccountMember[] {
    return this.invitedMembers;
  }
}
