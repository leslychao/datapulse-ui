import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {finalize} from "rxjs/operators";

import {AccountConnectionsApiClient, ApiError} from "../../core/api";
import {
  AccountConnection,
  AccountConnectionCreateRequest,
  AccountConnectionUpdateRequest,
  Marketplace,
  OzonCredentials,
  WildberriesCredentials
} from "../../shared/models";
import {
  ButtonComponent,
  DashboardShellComponent,
  InputComponent,
  LoaderComponent,
  ModalComponent,
  ToastService
} from "../../shared/ui";
import {ConnectionsTableComponent} from "../../features/connections";

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
export class SettingsConnectionsPageComponent implements OnInit {
  accountId: number | null = null;
  connections: AccountConnection[] = [];
  loading = true;
  saving = false;
  error: ApiError | null = null;

  modalVisible = false;
  editingConnection: AccountConnection | null = null;

  readonly marketplaceOptions = Object.values(Marketplace);
  readonly marketplaceWildberries = Marketplace.Wildberries;
  readonly marketplaceOzon = Marketplace.Ozon;

  readonly form: FormGroup<{
    marketplace: FormControl<Marketplace>;
    active: FormControl<boolean>;
    token: FormControl<string>;
    clientId: FormControl<string>;
    apiKey: FormControl<string>;
  }>;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly connectionApi: AccountConnectionsApiClient,
    private readonly toastService: ToastService,
    private readonly fb: FormBuilder
  ) {
    this.form = this.fb.nonNullable.group({
      marketplace: [Marketplace.Wildberries],
      active: [true],
      token: [""],
      clientId: [""],
      apiKey: [""]
    });
  }

  ngOnInit(): void {
    const accountId = Number(this.route.snapshot.paramMap.get("accountId"));
    this.accountId = Number.isFinite(accountId) ? accountId : null;
    if (this.accountId == null) {
      this.loading = false;
      this.error = {status: 400, message: "Account is not selected."};
      return;
    }
    this.loadConnections();
  }

  get isWildberries(): boolean {
    return this.form.controls.marketplace.value === Marketplace.Wildberries;
  }

  loadConnections(): void {
    if (this.accountId == null) {
      return;
    }
    this.loading = true;
    this.error = null;
    this.connectionApi
      .list(this.accountId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (connections) => {
          this.connections = connections;
        },
        error: (error: ApiError) => {
          this.error = error;
          this.toastService.error(this.mapErrorMessage(error, "Не удалось загрузить подключения."));
        }
      });
  }

  openCreateModal(): void {
    this.editingConnection = null;
    this.form.reset({
      marketplace: Marketplace.Wildberries,
      active: true,
      token: "",
      clientId: "",
      apiKey: ""
    });
    this.form.controls.marketplace.enable();
    this.modalVisible = true;
  }

  openEditModal(connection: AccountConnection): void {
    this.editingConnection = connection;
    this.form.reset({
      marketplace: connection.marketplace,
      active: connection.active,
      token: "",
      clientId: "",
      apiKey: ""
    });
    this.form.controls.marketplace.disable();
    this.modalVisible = true;
  }

  closeModal(): void {
    this.modalVisible = false;
    this.editingConnection = null;
    this.form.reset({
      marketplace: Marketplace.Wildberries,
      active: true,
      token: "",
      clientId: "",
      apiKey: ""
    });
  }

  submit(): void {
    if (this.accountId == null || this.saving) {
      return;
    }
    const {marketplace, active, token, clientId, apiKey} = this.form.getRawValue();
    const credentials = this.buildCredentials(marketplace, token, clientId, apiKey);
    const hasCredentialInput = Boolean(token || clientId || apiKey);

    if (!this.editingConnection) {
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
        .create(this.accountId, request)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.saving = false;
          })
        )
        .subscribe({
          next: (connection) => {
            this.connections = [connection, ...this.connections];
            this.toastService.success("Подключение добавлено.");
            this.closeModal();
          },
          error: (error: ApiError) => {
            this.toastService.error(this.mapErrorMessage(error, "Не удалось создать подключение."));
          }
        });
      return;
    }

    if (hasCredentialInput && !credentials) {
      this.toastService.error("Заполните все поля доступа для выбранного маркетплейса.");
      return;
    }

    const update: AccountConnectionUpdateRequest = {
      marketplace,
      active
    };
    if (credentials) {
      update.credentials = credentials;
    }

    const connectionId = this.editingConnection.id;
    this.saving = true;
    this.connectionApi
      .update(this.accountId, connectionId, update)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.saving = false;
        })
      )
      .subscribe({
        next: (updated) => {
          this.connections = this.connections.map((item) =>
            item.id === updated.id ? updated : item
          );
          this.toastService.success("Подключение обновлено.");
          this.closeModal();
        },
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось обновить подключение."));
        }
      });
  }

  confirmDelete(connection: AccountConnection): void {
    if (this.accountId == null) {
      return;
    }
    const confirmed = window.confirm("Удалить подключение?");
    if (!confirmed) {
      return;
    }
    this.connectionApi
      .remove(this.accountId, connection.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.connections = this.connections.filter((item) => item.id !== connection.id);
          this.toastService.success("Подключение удалено.");
        },
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось удалить подключение."));
        }
      });
  }

  private buildCredentials(
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

  private mapErrorMessage(error: ApiError, fallback: string): string {
    if (error.status === 409) {
      return "Подключение уже существует.";
    }
    return error.message || fallback;
  }
}
