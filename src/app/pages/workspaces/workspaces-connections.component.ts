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
import {LoadState, toLoadState} from "../../shared/operators/to-load-state";
import {
  ButtonComponent,
  InputComponent,
  LoaderComponent,
  ModalComponent,
  ToastService
} from "../../shared/ui";
import {ConnectionsTableComponent} from "../../features/connections";

interface ConnectionsViewModel {
  accountId: number | null;
  state: LoadState<AccountConnection[], ApiError>;
}

@Component({
  selector: "dp-workspaces-connections",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConnectionsTableComponent,
    ModalComponent,
    ButtonComponent,
    InputComponent,
    LoaderComponent
  ],
  templateUrl: "./workspaces-connections.component.html",
  styleUrl: "./workspaces-connections.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspacesConnectionsComponent {
  saving = false;
  createModalVisible = false;
  replaceModalVisible = false;
  deleteModalVisible = false;
  replacingConnection: AccountConnection | null = null;
  deletingConnection: AccountConnection | null = null;

  private readonly route = inject(ActivatedRoute);
  private readonly connectionApi = inject(AccountConnectionsApiClient);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly marketplaceOptions = Object.values(Marketplace);

  readonly createForm: FormGroup<{
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

  readonly replaceForm: FormGroup<{
    token: FormControl<string>;
    clientId: FormControl<string>;
    apiKey: FormControl<string>;
  }> = this.fb.nonNullable.group({
    token: [""],
    clientId: [""],
    apiKey: [""]
  });

  private readonly refresh$ = new Subject<void>();
  private readonly accountId$ = (this.route.parent?.paramMap ?? this.route.paramMap).pipe(
    map((params) => {
      const accountIdParam = params.get("accountId");
      if (accountIdParam == null) {
        return null;
      }
      const accountId = Number(accountIdParam);
      return Number.isFinite(accountId) ? accountId : null;
    }),
    distinctUntilChanged()
  );

  readonly vm$ = this.accountId$.pipe(
    switchMap((accountId) => {
      if (accountId == null) {
        return of({
          accountId,
          state: {status: "error", error: {status: 400, message: "Workspace не выбран."}}
        } as ConnectionsViewModel);
      }
      return this.refresh$.pipe(
        startWith(void 0),
        switchMap(() => this.connectionApi.listConnections(accountId).pipe(toLoadState<AccountConnection[], ApiError>())),
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

  get createIsWildberries(): boolean {
    return this.createForm.controls.marketplace.value === Marketplace.Wildberries;
  }

  get replaceIsWildberries(): boolean {
    return (this.replacingConnection?.marketplace ?? Marketplace.Wildberries) === Marketplace.Wildberries;
  }

  openCreateModal(): void {
    this.createForm.reset({
      marketplace: Marketplace.Wildberries,
      active: true,
      token: "",
      clientId: "",
      apiKey: ""
    });
    this.createModalVisible = true;
    this.cdr.markForCheck();
  }

  openReplaceModal(connection: AccountConnection): void {
    this.replacingConnection = connection;
    this.replaceForm.reset({
      token: "",
      clientId: "",
      apiKey: ""
    });
    this.replaceModalVisible = true;
    this.cdr.markForCheck();
  }

  closeCreateModal(): void {
    this.createModalVisible = false;
    this.createForm.reset({
      marketplace: Marketplace.Wildberries,
      active: true,
      token: "",
      clientId: "",
      apiKey: ""
    });
    this.cdr.markForCheck();
  }

  closeReplaceModal(): void {
    this.replaceModalVisible = false;
    this.replacingConnection = null;
    this.replaceForm.reset({
      token: "",
      clientId: "",
      apiKey: ""
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
    const {marketplace, active, token, clientId, apiKey} = this.createForm.getRawValue();
    const credentials = this.buildCredentials(marketplace, token, clientId, apiKey);
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
      .createConnection(accountId, request)
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

  submitReplace(): void {
    const accountId = this.getAccountId();
    if (accountId == null || this.saving || !this.replacingConnection) {
      return;
    }
    const {token, clientId, apiKey} = this.replaceForm.getRawValue();
    const credentials = this.buildCredentials(this.replacingConnection.marketplace, token, clientId, apiKey);
    if (!credentials) {
      this.toastService.error("Заполните данные доступа для подключения.");
      return;
    }
    const update: AccountConnectionUpdateRequest = {
      marketplace: this.replacingConnection.marketplace,
      credentials
    };
    this.saving = true;
    this.connectionApi
      .updateConnection(accountId, this.replacingConnection.id, update)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.toastService.success("Credentials обновлены.");
          this.closeReplaceModal();
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
      .deleteConnection(accountId, this.deletingConnection.id)
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
    const accountIdParam = (this.route.parent ?? this.route).snapshot.paramMap.get("accountId");
    if (accountIdParam == null) {
      return null;
    }
    const accountId = Number(accountIdParam);
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
    return error.message || fallback;
  }
}
