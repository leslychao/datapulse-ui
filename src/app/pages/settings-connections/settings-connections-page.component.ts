import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import {Subject, distinctUntilChanged, map, of, switchMap} from "rxjs";
import {finalize, startWith, tap} from "rxjs/operators";

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
  modalVisible = false;
  editingConnection: AccountConnection | null = null;

  private readonly route = inject(ActivatedRoute);
  private readonly connectionApi = inject(AccountConnectionsApiClient);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly marketplaceOptions = Object.values(Marketplace);
  readonly marketplaceWildberries = Marketplace.Wildberries;
  readonly marketplaceOzon = Marketplace.Ozon;

  readonly form: FormGroup<{
    marketplace: FormControl<Marketplace>;
    active: FormControl<boolean>;
    token: FormControl<string>;
    clientId: FormControl<string>;
    apiKey: FormControl<string>;
  }> = this.fb.nonNullable.group({
    marketplace: [Marketplace.Wildberries],
    active: [true],
    token: [""],
    clientId: [""],
    apiKey: [""]
  });

  private readonly refresh$ = new Subject<void>();
  private readonly accountId$ = this.route.paramMap.pipe(
    map((params) => Number(params.get("accountId"))),
    map((accountId) => (Number.isFinite(accountId) ? accountId : null)),
    distinctUntilChanged()
  );

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
              this.mapErrorMessage(state.error, "Не удалось загрузить подключения.")
            );
          }
        }),
        map((state) => ({accountId, state}))
      );
    })
  );

  get isWildberries(): boolean {
    return this.form.controls.marketplace.value === Marketplace.Wildberries;
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
    const accountId = this.getAccountId();
    if (accountId == null || this.saving) {
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
            this.closeModal();
            this.refresh$.next();
            this.cdr.markForCheck();
          },
          error: (error: ApiError) => {
            this.toastService.error(this.mapErrorMessage(error, "Не удалось создать подключение."));
            this.cdr.markForCheck();
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
      .update(accountId, connectionId, update)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.toastService.success("Подключение обновлено.");
          this.closeModal();
          this.refresh$.next();
          this.cdr.markForCheck();
        },
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось обновить подключение."));
          this.cdr.markForCheck();
        }
      });
  }

  confirmDelete(connection: AccountConnection): void {
    const accountId = this.getAccountId();
    if (accountId == null) {
      return;
    }
    const confirmed = window.confirm("Удалить подключение?");
    if (!confirmed) {
      return;
    }
    this.connectionApi
      .remove(accountId, connection.id)
      .pipe(
        finalize(() => {
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.toastService.success("Подключение удалено.");
          this.refresh$.next();
          this.cdr.markForCheck();
        },
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось удалить подключение."));
          this.cdr.markForCheck();
        }
      });
  }

  private getAccountId(): number | null {
    const accountId = Number(this.route.snapshot.paramMap.get("accountId"));
    return Number.isFinite(accountId) ? accountId : null;
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
