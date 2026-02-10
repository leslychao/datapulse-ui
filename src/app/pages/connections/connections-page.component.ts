// connections-page.component.ts
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {Subject, map, of, switchMap} from "rxjs";
import {finalize, startWith, tap} from "rxjs/operators";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AccountConnectionsApiClient, ApiError} from "../../core/api";
import {
  AccountConnection,
  AccountConnectionCreateRequest,
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

type WizardStep = "marketplace" | "credentials";
type EditControlName = "token" | "clientId" | "apiKey";

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
  saving = false;

  wizardVisible = false;
  wizardStep: WizardStep = "marketplace";
  wizardError: string | null = null;
  isValidating = false;

  editVisible = false;

  deleteDialogVisible = false;
  disableDialogVisible = false;
  enableDialogVisible = false;

  openActionMenuId: number | null = null;

  editingConnection: AccountConnection | null = null;

  deletingConnection: AccountConnection | null = null;
  disablingConnection: AccountConnection | null = null;
  enablingConnection: AccountConnection | null = null;

  private readonly route = inject(ActivatedRoute);
  private readonly connectionApi = inject(AccountConnectionsApiClient);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly marketplaceOptions = Object.values(Marketplace);

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
    this.isValidating = false;
    this.wizardVisible = true;
    this.cdr.markForCheck();
  }

  closeWizard(): void {
    if (this.isValidating) {
      return;
    }
    this.wizardVisible = false;
    this.cdr.markForCheck();
  }

  nextWizardStep(): void {
    if (this.wizardStep === "marketplace") {
      this.wizardStep = "credentials";
      this.cdr.markForCheck();
      return;
    }

    if (this.wizardStep === "credentials") {
      if (this.wizardForm.invalid) {
        this.wizardForm.markAllAsTouched();
        this.cdr.markForCheck();
        return;
      }
      this.validateCredentials();
    }
  }

  validateCredentials(): void {
    if (this.isValidating || this.saving) {
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

    this.isValidating = true;
    this.saving = true;
    this.wizardError = null;
    this.cdr.markForCheck();

    this.connectionApi
    .create(accountId, request)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        this.toastService.success("Подключение создано.");
        this.wizardVisible = false;
        this.refresh$.next();
      }),
      tap({
        error: (error: ApiError) => {
          this.wizardError = this.mapErrorMessage(error, "Не удалось проверить credentials.");
        }
      }),
      finalize(() => {
        this.isValidating = false;
        this.saving = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe();
  }

  openEditModal(connection: AccountConnection): void {
    this.editingConnection = connection;
    this.resetEditFormHard();
    this.editVisible = true;
    this.cdr.markForCheck();
  }

  closeEditModal(): void {
    this.editVisible = false;
    this.editingConnection = null;
    this.resetEditFormHard();
    this.cdr.markForCheck();
  }

  clearEditControl(controlName: EditControlName): void {
    const control = this.editForm.controls[controlName];
    control.setValue("");
    control.markAsPristine();
    control.markAsUntouched();
    control.updateValueAndValidity();
    this.cdr.markForCheck();
  }

  private resetEditFormHard(): void {
    this.editForm.reset({
      token: "",
      clientId: "",
      apiKey: ""
    });

    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();

    this.editForm.controls.token.updateValueAndValidity();
    this.editForm.controls.clientId.updateValueAndValidity();
    this.editForm.controls.apiKey.updateValueAndValidity();
  }

  submitEdit(): void {
    if (!this.editingConnection || this.saving) {
      return;
    }

    const accountId = this.getAccountId();
    if (accountId == null) {
      return;
    }

    const request = this.buildEditUpdateRequest(this.editingConnection);
    if (request == null) {
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();

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

  private buildEditUpdateRequest(connection: AccountConnection): AccountConnectionUpdateRequest | null {
    const token = this.trimToNull(this.editForm.controls.token.value);
    const clientId = this.trimToNull(this.editForm.controls.clientId.value);
    const apiKey = this.trimToNull(this.editForm.controls.apiKey.value);

    if (connection.marketplace === Marketplace.Wildberries) {
      if (token == null) {
        this.toastService.info("Нечего обновлять.");
        return null;
      }
      return {
        marketplace: connection.marketplace,
        credentials: {token}
      };
    }

    const hasClientId = clientId != null;
    const hasApiKey = apiKey != null;

    if (!hasClientId && !hasApiKey) {
      this.toastService.info("Нечего обновлять.");
      return null;
    }

    if (hasClientId !== hasApiKey) {
      this.toastService.error("Для Ozon заполните Client ID и API Key.");
      return null;
    }

    return {
      marketplace: connection.marketplace,
      credentials: {clientId: clientId as string, apiKey: apiKey as string}
    };
  }

  private trimToNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  requestDelete(connection: AccountConnection): void {
    this.deletingConnection = connection;
    this.deleteDialogVisible = true;
    this.cdr.markForCheck();
  }

  closeDeleteDialog(): void {
    this.deleteDialogVisible = false;
    this.deletingConnection = null;
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();

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
    this.cdr.markForCheck();
  }

  closeDisableDialog(): void {
    this.disableDialogVisible = false;
    this.disablingConnection = null;
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();

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
    this.cdr.markForCheck();
  }

  closeEnableDialog(): void {
    this.enableDialogVisible = false;
    this.enablingConnection = null;
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();

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

  getStatusLabel(connection: AccountConnection): string {
    return connection.active ? "Enabled" : "Disabled";
  }

  getStatusClass(connection: AccountConnection): string {
    return connection.active ? "status-pill" : "status-pill is-disabled";
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
