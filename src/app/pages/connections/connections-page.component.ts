import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {HttpClient} from "@angular/common/http";
import {ActivatedRoute} from "@angular/router";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {Subject, map, of, switchMap} from "rxjs";
import {finalize, startWith, tap} from "rxjs/operators";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AccountConnectionsApiClient, ApiError} from "../../core/api";
import {
  AccountConnection,
  AccountConnectionCreateRequest,
  AccountConnectionSyncStatus,
  AccountConnectionUpdateRequest,
  Marketplace
} from "../../shared/models";
import {accountIdFromRoute} from "../../core/routing/account-id.util";
import {
  ButtonComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  FormFieldComponent,
  InputComponent,
  LoadingStateComponent,
  ModalComponent,
  PageHeaderComponent,
  PageLayoutComponent,
  SelectComponent,
  TableComponent,
  TableToolbarComponent,
  ToastService
} from "../../shared/ui";
import {LoadState, toLoadState} from "../../shared/operators/to-load-state";

interface ConnectionsViewModel {
  accountId: number | null;
  state: LoadState<AccountConnection[], ApiError>;
}

type WizardStep = "marketplace" | "credentials" | "validate" | "sync" | "success";

type EtlEventCode =
  | "WAREHOUSE_DICT"
  | "CATEGORY_DICT"
  | "TARIFF_DICT"
  | "PRODUCT_DICT"
  | "SALES_FACT"
  | "INVENTORY_FACT"
  | "FACT_FINANCE";

type EtlDateMode = "LAST_DAYS";

interface EtlScenarioRunEvent {
  event: EtlEventCode;
  dateMode: EtlDateMode;
  lastDays: number;
}

interface EtlScenarioRunRequest {
  accountId: number;
  events: EtlScenarioRunEvent[];
}

@Component({
  selector: "dp-connections-page",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageLayoutComponent,
    PageHeaderComponent,
    TableComponent,
    TableToolbarComponent,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    FormFieldComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    ModalComponent,
    ConfirmDialogComponent
  ],
  templateUrl: "./connections-page.component.html",
  styleUrl: "./connections-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConnectionsPageComponent {
  readonly syncStatus = AccountConnectionSyncStatus;

  saving = false;

  wizardVisible = false;
  wizardStep: WizardStep = "marketplace";
  wizardError: string | null = null;
  createdConnection: AccountConnection | null = null;

  editVisible = false;
  detailsVisible = false;
  detailsExpanded = false;

  deleteDialogVisible = false;
  disableDialogVisible = false;
  enableDialogVisible = false;

  openActionMenuId: number | null = null;

  editingConnection: AccountConnection | null = null;
  detailsConnection: AccountConnection | null = null;

  deletingConnection: AccountConnection | null = null;
  disablingConnection: AccountConnection | null = null;
  enablingConnection: AccountConnection | null = null;

  private readonly route = inject(ActivatedRoute);
  private readonly connectionApi = inject(AccountConnectionsApiClient);
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly marketplaceOptions = Object.values(Marketplace);

  private readonly syncRequestedConnectionIds = new Set<number>();

  readonly wizardForm: FormGroup<{
    marketplace: FormControl<Marketplace>;
    token: FormControl<string>;
    clientId: FormControl<string>;
    apiKey: FormControl<string>;
  }> = this.fb.nonNullable.group({
    marketplace: [Marketplace.Wildberries, Validators.required],
    token: [""],
    clientId: [""],
    apiKey: [""]
  });

  readonly editForm: FormGroup<{
    token: FormControl<string>;
    clientId: FormControl<string>;
    apiKey: FormControl<string>;
  }> = this.fb.nonNullable.group({
    token: [""],
    clientId: [""],
    apiKey: [""]
  });

  readonly marketplaceFilterControl = this.fb.nonNullable.control("");

  private readonly refresh$ = new Subject<void>();
  private readonly accountId$ = accountIdFromRoute(this.route);

  readonly vm$ = this.accountId$.pipe(
    switchMap((accountId) => {
      if (accountId == null) {
        return of({
          accountId,
          state: {status: "error", error: {status: 400, message: "Workspace is not selected."}}
        } as ConnectionsViewModel);
      }
      return this.refresh$.pipe(
        startWith(void 0),
        switchMap(() => this.connectionApi.list(accountId).pipe(toLoadState<AccountConnection[], ApiError>())),
        tap((state) => {
          if (state.status === "error") {
            this.toastService.error(this.mapErrorMessage(state.error, "Не удалось загрузить подключения."), {
              details: state.error.details,
              correlationId: state.error.correlationId
            });
          }
        }),
        map((state) => ({accountId, state}))
      );
    })
  );

  constructor() {
    this.applyCredentialValidators(this.wizardForm, Marketplace.Wildberries);
    this.wizardForm.controls.marketplace.valueChanges
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe((value) => {
      this.applyCredentialValidators(this.wizardForm, value);
      this.cdr.markForCheck();
    });
  }

  get wizardIsWildberries(): boolean {
    return this.wizardForm.controls.marketplace.value === Marketplace.Wildberries;
  }

  get editIsWildberries(): boolean {
    return (this.editingConnection?.marketplace ?? Marketplace.Wildberries) === Marketplace.Wildberries;
  }

  get wizardStepLabel(): string {
    switch (this.wizardStep) {
      case "marketplace":
        return "Select marketplace";
      case "credentials":
        return "Enter credentials";
      case "validate":
        return "Validate connection";
      case "sync":
        return "Initial sync";
      case "success":
        return "Success";
      default:
        return "";
    }
  }

  refresh(): void {
    this.refresh$.next();
  }

  toggleActionMenu(connectionId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openActionMenuId = this.openActionMenuId === connectionId ? null : connectionId;
    this.cdr.markForCheck();
  }

  closeActionMenu(): void {
    this.openActionMenuId = null;
    this.cdr.markForCheck();
  }

  openWizard(): void {
    this.wizardForm.reset({
      marketplace: Marketplace.Wildberries,
      token: "",
      clientId: "",
      apiKey: ""
    });
    this.applyCredentialValidators(this.wizardForm, Marketplace.Wildberries);
    this.wizardStep = "marketplace";
    this.wizardError = null;
    this.createdConnection = null;
    this.wizardVisible = true;
  }

  closeWizard(): void {
    if (this.saving) {
      return;
    }
    this.wizardVisible = false;
  }

  nextWizardStep(): void {
    if (this.wizardStep === "marketplace") {
      this.wizardStep = "credentials";
      return;
    }
    if (this.wizardStep === "credentials") {
      if (this.wizardForm.invalid) {
        this.wizardForm.markAllAsTouched();
        return;
      }
      this.wizardStep = "validate";
      this.validateCredentials();
      return;
    }
    if (this.wizardStep === "sync") {
      this.wizardStep = "success";
      return;
    }
    if (this.wizardStep === "success") {
      this.closeWizard();
    }
  }

  validateCredentials(): void {
    if (this.saving) {
      return;
    }
    const accountId = this.getAccountId();
    if (accountId == null) {
      return;
    }

    const {marketplace, token, clientId, apiKey} = this.wizardForm.getRawValue();
    const request: AccountConnectionCreateRequest = {
      marketplace,
      credentials: marketplace === Marketplace.Wildberries ? {token} : {clientId, apiKey}
    };

    this.saving = true;
    this.wizardError = null;

    this.connectionApi
    .create(accountId, request)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((connection) => {
        this.createdConnection = connection;
        this.wizardStep = "sync";
        this.toastService.success("Подключение создано. Запускаем первичную синхронизацию.");
        this.refresh$.next();
      }),
      tap({
        error: (error: ApiError) => {
          this.wizardError = this.mapErrorMessage(error, "Не удалось проверить credentials.");
        }
      }),
      finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe();
  }

  finishWizard(): void {
    this.closeWizard();
  }

  openEditModal(connection: AccountConnection): void {
    this.editingConnection = connection;
    this.editForm.reset({
      token: "",
      clientId: "",
      apiKey: ""
    });
    this.applyCredentialValidators(this.editForm, connection.marketplace, false);
    this.editVisible = true;
  }

  closeEditModal(): void {
    this.editVisible = false;
    this.editingConnection = null;
  }

  submitEdit(): void {
    if (!this.editingConnection || this.editForm.invalid || this.saving) {
      this.editForm.markAllAsTouched();
      return;
    }
    const accountId = this.getAccountId();
    if (accountId == null) {
      return;
    }

    const {token, clientId, apiKey} = this.editForm.getRawValue();
    const request: AccountConnectionUpdateRequest = {
      marketplace: this.editingConnection.marketplace,
      credentials:
        this.editingConnection.marketplace === Marketplace.Wildberries
          ? {token}
          : {clientId, apiKey}
    };

    this.saving = true;

    this.connectionApi
    .update(accountId, this.editingConnection.id, request)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        this.toastService.success("Подключение обновлено.");
        this.refresh$.next();
        this.closeEditModal();
      }),
      tap({
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось обновить подключение."), {
            details: error.details,
            correlationId: error.correlationId
          });
        }
      }),
      finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe();
  }

  openDetails(connection: AccountConnection): void {
    this.detailsConnection = connection;
    this.detailsVisible = true;
    this.detailsExpanded = false;
  }

  closeDetails(): void {
    this.detailsVisible = false;
    this.detailsConnection = null;
    this.detailsExpanded = false;
  }

  toggleDetails(): void {
    this.detailsExpanded = !this.detailsExpanded;
  }

  requestDelete(connection: AccountConnection): void {
    this.deletingConnection = connection;
    this.deleteDialogVisible = true;
  }

  closeDeleteDialog(): void {
    this.deleteDialogVisible = false;
    this.deletingConnection = null;
  }

  deleteConnection(): void {
    if (!this.deletingConnection || this.saving) {
      return;
    }
    const accountId = this.getAccountId();
    if (accountId == null) {
      return;
    }

    this.saving = true;

    this.connectionApi
    .remove(accountId, this.deletingConnection.id)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        this.toastService.success("Подключение удалено.");
        this.refresh$.next();
        this.closeDeleteDialog();
      }),
      tap({
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось удалить подключение."), {
            details: error.details,
            correlationId: error.correlationId
          });
        }
      }),
      finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe();
  }

  requestDisable(connection: AccountConnection): void {
    this.disablingConnection = connection;
    this.disableDialogVisible = true;
  }

  closeDisableDialog(): void {
    this.disableDialogVisible = false;
    this.disablingConnection = null;
  }

  disableConnection(): void {
    if (!this.disablingConnection || this.saving) {
      return;
    }
    const accountId = this.getAccountId();
    if (accountId == null) {
      return;
    }

    this.saving = true;

    const request: AccountConnectionUpdateRequest = {
      active: false
    };

    this.connectionApi
    .update(accountId, this.disablingConnection.id, request)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        this.toastService.success("Подключение отключено.");
        this.refresh$.next();
        this.closeDisableDialog();
      }),
      tap({
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось отключить подключение."), {
            details: error.details,
            correlationId: error.correlationId
          });
        }
      }),
      finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe();
  }

  requestEnable(connection: AccountConnection): void {
    this.enablingConnection = connection;
    this.enableDialogVisible = true;
  }

  closeEnableDialog(): void {
    this.enableDialogVisible = false;
    this.enablingConnection = null;
  }

  enableConnection(): void {
    if (!this.enablingConnection || this.saving) {
      return;
    }
    const accountId = this.getAccountId();
    if (accountId == null) {
      return;
    }

    this.saving = true;

    const request: AccountConnectionUpdateRequest = {
      active: true
    };

    this.connectionApi
    .update(accountId, this.enablingConnection.id, request)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        this.toastService.success("Подключение включено.");
        this.refresh$.next();
        this.closeEnableDialog();
      }),
      tap({
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось включить подключение."), {
            details: error.details,
            correlationId: error.correlationId
          });
        }
      }),
      finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe();
  }

  requestRunSync(connection: AccountConnection): void {
    if (!this.canRunSync(connection)) {
      return;
    }
    this.syncRequestedConnectionIds.add(connection.id);
    this.cdr.markForCheck();
    this.runEtlScenario();
  }

  canRunSync(connection: AccountConnection): boolean {
    if (this.saving) {
      return false;
    }
    if (!connection.active) {
      return false;
    }
    if (this.syncRequestedConnectionIds.has(connection.id)) {
      return false;
    }
    return true;
  }

  private runEtlScenario(): void {
    const accountId = this.getAccountId();
    if (accountId == null) {
      this.syncRequestedConnectionIds.clear();
      this.cdr.markForCheck();
      return;
    }

    const request: EtlScenarioRunRequest = {
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

    this.saving = true;

    this.http
    .post<void>("/api/etl/scenario/run", request)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        this.toastService.success("Синхронизация запущена.");
        this.refresh$.next();
      }),
      tap({
        error: () => {
          this.toastService.error("Не удалось запустить синхронизацию.");
        }
      }),
      finalize(() => {
        this.saving = false;
        this.syncRequestedConnectionIds.clear();
        this.cdr.markForCheck();
      })
    )
    .subscribe();
  }

  getStatusLabel(connection: AccountConnection): string {
    if (!connection.active) {
      return "Disabled";
    }
    if (connection.lastSyncStatus === AccountConnectionSyncStatus.Failed) {
      return "Error";
    }
    if (!connection.lastSyncAt) {
      return "Not synced yet";
    }
    return "Connected";
  }

  getStatusClass(connection: AccountConnection): string {
    if (!connection.active) {
      return "status-pill is-disabled";
    }
    if (connection.lastSyncStatus === AccountConnectionSyncStatus.Failed) {
      return "status-pill is-error";
    }
    if (!connection.lastSyncAt) {
      return "status-pill is-syncing";
    }
    return "status-pill";
  }

  getFreshness(connection: AccountConnection): string {
    if (!connection.lastSyncAt) {
      return "No sync yet";
    }
    const last = new Date(connection.lastSyncAt).getTime();
    const hours = Math.floor((Date.now() - last) / 3600000);
    if (hours < 6) {
      return "Fresh";
    }
    if (hours < 24) {
      return `Updated ${hours}h ago`;
    }
    return "Stale";
  }

  filteredConnections(connections: AccountConnection[]): AccountConnection[] {
    const selected = this.marketplaceFilterControl.value;
    if (!selected) {
      return connections;
    }
    return connections.filter((connection) => connection.marketplace === selected);
  }

  private applyCredentialValidators(form: FormGroup, marketplace: Marketplace, reset: boolean = true): void {
    const tokenControl = form.get("token");
    const clientIdControl = form.get("clientId");
    const apiKeyControl = form.get("apiKey");

    if (!tokenControl || !clientIdControl || !apiKeyControl) {
      return;
    }

    if (marketplace === Marketplace.Wildberries) {
      tokenControl.setValidators([Validators.required]);
      clientIdControl.clearValidators();
      apiKeyControl.clearValidators();
      if (reset) {
        clientIdControl.reset("");
        apiKeyControl.reset("");
      }
    } else {
      tokenControl.clearValidators();
      clientIdControl.setValidators([Validators.required]);
      apiKeyControl.setValidators([Validators.required]);
      if (reset) {
        tokenControl.reset("");
      }
    }

    tokenControl.updateValueAndValidity();
    clientIdControl.updateValueAndValidity();
    apiKeyControl.updateValueAndValidity();
  }

  private getAccountId(): number | null {
    const raw = this.route.snapshot.paramMap.get("accountId");
    const parsed = raw ? Number(raw) : null;
    return parsed != null && Number.isFinite(parsed) ? parsed : null;
  }

  private mapErrorMessage(error: ApiError, fallback: string): string {
    return error.message || fallback;
  }
}
