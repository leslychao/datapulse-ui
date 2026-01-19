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
  Marketplace,
  OzonCredentials,
  WildberriesCredentials
} from "../../shared/models";
import {accountIdFromRoute} from "../../core/routing/account-id.util";
import {
  ButtonComponent,
  DashboardShellComponent,
  InputComponent,
  LoaderComponent,
  ModalComponent,
  ToastService
} from "../../shared/ui";
import {ConnectionsTableComponent} from "../../features/connections";
import {LoadState, toLoadState} from "../../shared/operators/to-load-state";

interface ConnectionsViewModel {
  accountId: number | null;
  state: LoadState<AccountConnection[], ApiError>;
}

@Component({
  selector: "dp-settings-connections-page",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DashboardShellComponent,
    ConnectionsTableComponent,
    ModalComponent,
    ButtonComponent,
    InputComponent,
    LoaderComponent
  ],
  templateUrl: "./settings-connections-page.component.html",
  styleUrl: "./settings-connections-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsConnectionsPageComponent {
  saving = false;
  createModalVisible = false;
  editModalVisible = false;
  deleteModalVisible = false;
  editingConnection: AccountConnection | null = null;
  deletingConnection: AccountConnection | null = null;
  accountId: number | null = null;

  private readonly route = inject(ActivatedRoute);
  private readonly connectionApi = inject(AccountConnectionsApiClient);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly marketplaceOptions = Object.values(Marketplace);

  readonly createForm: FormGroup<{
    marketplace: FormControl<Marketplace>;
    token: FormControl<string>;
    clientId: FormControl<string>;
    apiKey: FormControl<string>;
    active: FormControl<boolean>;
  }> = this.fb.nonNullable.group({
    marketplace: [Marketplace.Wildberries, Validators.required],
    token: [""],
    clientId: [""],
    apiKey: [""],
    active: [true]
  });

  readonly editForm: FormGroup<{
    token: FormControl<string>;
    clientId: FormControl<string>;
    apiKey: FormControl<string>;
    active: FormControl<boolean>;
  }> = this.fb.nonNullable.group({
    token: [""],
    clientId: [""],
    apiKey: [""],
    active: [true]
  });

  private readonly refresh$ = new Subject<void>();
  private readonly accountId$ = accountIdFromRoute(this.route);

  readonly vm$ = this.accountId$.pipe(
    switchMap((accountId) => {
      if (accountId == null) {
        return of({
          accountId,
          state: {status: "error", error: {status: 400, message: "Account is not selected."}}
        } as ConnectionsViewModel);
      }
      return this.refresh$.pipe(
        startWith(void 0),
        switchMap(() => this.connectionApi.list(accountId).pipe(toLoadState<AccountConnection[], ApiError>())),
        tap((state) => {
          if (state.status === "error") {
            this.toastService.error(
              this.mapErrorMessage(state.error, "Не удалось загрузить подключения."),
              {
                details: state.error.details,
                correlationId: state.error.correlationId
              }
            );
          }
        }),
        map((state) => ({accountId, state}))
      );
    })
  );

  constructor() {
    this.applyCredentialValidators(this.createForm, Marketplace.Wildberries);
    this.createForm.controls.marketplace.valueChanges.subscribe((value) => {
      this.applyCredentialValidators(this.createForm, value);
    });

    this.accountId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((accountId) => {
        this.accountId = accountId;
        this.cdr.markForCheck();
      });
  }

  get createIsWildberries(): boolean {
    return this.createForm.controls.marketplace.value === Marketplace.Wildberries;
  }

  get editIsWildberries(): boolean {
    return (this.editingConnection?.marketplace ?? Marketplace.Wildberries) === Marketplace.Wildberries;
  }

  refresh(): void {
    this.refresh$.next();
  }

  openCreateModal(): void {
    this.createForm.reset({
      marketplace: Marketplace.Wildberries,
      token: "",
      clientId: "",
      apiKey: "",
      active: true
    });
    this.applyCredentialValidators(this.createForm, Marketplace.Wildberries);
    this.createModalVisible = true;
    this.cdr.markForCheck();
  }

  openEditModal(connection: AccountConnection): void {
    this.editingConnection = connection;
    this.editForm.reset({
      token: "",
      clientId: "",
      apiKey: "",
      active: connection.active
    });
    this.applyCredentialValidators(this.editForm, connection.marketplace, false);
    this.editModalVisible = true;
    this.cdr.markForCheck();
  }

  closeCreateModal(): void {
    this.createModalVisible = false;
    this.createForm.reset({
      marketplace: Marketplace.Wildberries,
      token: "",
      clientId: "",
      apiKey: "",
      active: true
    });
    this.cdr.markForCheck();
  }

  closeEditModal(): void {
    this.editModalVisible = false;
    this.editingConnection = null;
    this.editForm.reset({
      token: "",
      clientId: "",
      apiKey: "",
      active: true
    });
    this.cdr.markForCheck();
  }

  openDeleteModal(connection: AccountConnection): void {
    this.deletingConnection = connection;
    this.deleteModalVisible = true;
    this.cdr.markForCheck();
  }

  closeDeleteModal(): void {
    this.deleteModalVisible = false;
    this.deletingConnection = null;
    this.cdr.markForCheck();
  }

  submitCreate(): void {
    const accountId = this.getAccountId();
    if (accountId == null || this.saving) {
      return;
    }
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const {marketplace, token, clientId, apiKey, active} = this.createForm.getRawValue();
    const credentials = this.buildCredentialsForCreate(marketplace, token, clientId, apiKey);
    if (!credentials) {
      this.toastService.error("Заполните данные доступа для подключения.");
      return;
    }
    const request: AccountConnectionCreateRequest = {
      marketplace,
      credentials,
      active
    };
    this.saving = true;
    this.connectionApi
      .create(accountId, request)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.toastService.success("Подключение добавлено.");
          this.closeCreateModal();
          this.refresh$.next();
          this.cdr.markForCheck();
        },
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось создать подключение."), {
            details: error.details,
            correlationId: error.correlationId
          });
          this.cdr.markForCheck();
        }
      });
  }

  submitEdit(): void {
    const accountId = this.getAccountId();
    if (accountId == null || this.saving || !this.editingConnection) {
      return;
    }
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const {token, clientId, apiKey, active} = this.editForm.getRawValue();
    const credentials = this.buildCredentialsForEdit(
      this.editingConnection.marketplace,
      token,
      clientId,
      apiKey
    );
    if (credentials === null) {
      this.toastService.error("Заполните данные доступа для подключения.");
      return;
    }
    const update: AccountConnectionUpdateRequest = {active};
    if (credentials) {
      update.credentials = credentials;
    }
    this.saving = true;
    this.connectionApi
      .update(accountId, this.editingConnection.id, update)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.toastService.success("Подключение обновлено.");
          this.closeEditModal();
          this.refresh$.next();
          this.cdr.markForCheck();
        },
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось обновить подключение."), {
            details: error.details,
            correlationId: error.correlationId
          });
          this.cdr.markForCheck();
        }
      });
  }

  confirmDelete(connection: AccountConnection): void {
    this.openDeleteModal(connection);
  }

  deleteConnection(): void {
    const accountId = this.getAccountId();
    if (accountId == null || !this.deletingConnection || this.saving) {
      return;
    }
    this.saving = true;
    this.connectionApi
      .remove(accountId, this.deletingConnection.id)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.toastService.success("Подключение удалено.");
          this.closeDeleteModal();
          this.refresh$.next();
          this.cdr.markForCheck();
        },
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось удалить подключение."), {
            details: error.details,
            correlationId: error.correlationId
          });
          this.cdr.markForCheck();
        }
      });
  }

  private getAccountId(): number | null {
    return this.accountId;
  }

  private buildCredentialsForCreate(
    marketplace: Marketplace,
    token: string,
    clientId: string,
    apiKey: string
  ): WildberriesCredentials | OzonCredentials | null {
    if (marketplace === Marketplace.Wildberries) {
      if (!token) {
        return null;
      }
      return {token};
    }
    if (!clientId || !apiKey) {
      return null;
    }
    return {clientId, apiKey};
  }

  private buildCredentialsForEdit(
    marketplace: Marketplace,
    token: string,
    clientId: string,
    apiKey: string
  ): WildberriesCredentials | OzonCredentials | null | undefined {
    if (marketplace === Marketplace.Wildberries) {
      if (!token) {
        return undefined;
      }
      return {token};
    }
    if (!clientId && !apiKey) {
      return undefined;
    }
    if (!clientId || !apiKey) {
      return null;
    }
    return {clientId, apiKey};
  }

  private applyCredentialValidators(
    form: {controls: {token: FormControl<string>; clientId: FormControl<string>; apiKey: FormControl<string>}},
    marketplace: Marketplace,
    requireCredentials = true
  ): void {
    if (marketplace === Marketplace.Wildberries) {
      if (requireCredentials) {
        form.controls.token.setValidators([Validators.required, Validators.minLength(1)]);
      } else {
        form.controls.token.clearValidators();
      }
      form.controls.clientId.clearValidators();
      form.controls.apiKey.clearValidators();
    } else {
      form.controls.token.clearValidators();
      if (requireCredentials) {
        form.controls.clientId.setValidators([Validators.required, Validators.minLength(1)]);
        form.controls.apiKey.setValidators([Validators.required, Validators.minLength(1)]);
      } else {
        form.controls.clientId.clearValidators();
        form.controls.apiKey.clearValidators();
      }
    }
    form.controls.token.updateValueAndValidity({emitEvent: false});
    form.controls.clientId.updateValueAndValidity({emitEvent: false});
    form.controls.apiKey.updateValueAndValidity({emitEvent: false});
  }

  private mapErrorMessage(error: ApiError, fallback: string): string {
    return error.message || fallback;
  }
}
