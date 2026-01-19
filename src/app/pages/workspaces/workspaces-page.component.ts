import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject
} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {combineLatest, forkJoin, of, Subject, switchMap} from "rxjs";
import {finalize, shareReplay, startWith, tap} from "rxjs/operators";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {
  AccountConnectionsApiClient,
  AccountMembersApiClient,
  AccountsApiClient,
  ApiError,
  IamApiClient
} from "../../core/api";
import {
  AccountConnection,
  AccountMember,
  AccountResponse,
  AccountUpdateRequest
} from "../../shared/models";
import {AccountContextService} from "../../core/state";
import {
  ButtonComponent,
  DashboardShellComponent,
  InputComponent,
  LoaderComponent,
  ModalComponent,
  TableComponent,
  ToastService
} from "../../shared/ui";
import {LoadState, toLoadState} from "../../shared/operators/to-load-state";

interface WorkspaceDetails {
  connections: AccountConnection[];
  members: AccountMember[];
}

interface WorkspacesViewModel {
  accountsState: LoadState<AccountResponse[], ApiError>;
  selectedAccount: AccountResponse | null;
  detailsState: LoadState<WorkspaceDetails, ApiError>;
}

@Component({
  selector: "dp-workspaces-page",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DashboardShellComponent,
    ButtonComponent,
    InputComponent,
    LoaderComponent,
    ModalComponent,
    TableComponent
  ],
  templateUrl: "./workspaces-page.component.html",
  styleUrl: "./workspaces-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspacesPageComponent {
  private readonly iamApi = inject(IamApiClient);
  private readonly accountsApi = inject(AccountsApiClient);
  private readonly connectionsApi = inject(AccountConnectionsApiClient);
  private readonly membersApi = inject(AccountMembersApiClient);
  private readonly accountContext = inject(AccountContextService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  saving = false;
  createModalVisible = false;
  renameModalVisible = false;
  selectedAccountId: number | null = this.accountContext.snapshot;
  renamingAccount: AccountResponse | null = null;

  private readonly refreshAccounts$ = new Subject<void>();
  private readonly refreshDetails$ = new Subject<void>();

  readonly createForm: FormGroup<{
    name: FormControl<string>;
    active: FormControl<boolean>;
  }> = this.fb.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(32)]],
    active: [true]
  });

  readonly renameForm: FormGroup<{
    name: FormControl<string>;
  }> = this.fb.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(32)]]
  });

  readonly accountsState$ = this.refreshAccounts$.pipe(
    startWith(void 0),
    switchMap(() => this.iamApi.listAccounts().pipe(toLoadState<AccountResponse[], ApiError>())),
    tap((state) => {
      if (state.status === "ready") {
        const currentId = this.accountContext.snapshot;
        const hasSelection = state.data.some((account) => account.id === currentId);
        if (!hasSelection && state.data.length > 0) {
          this.accountContext.setAccountId(state.data[0].id);
        }
      }
      if (state.status === "error") {
        this.toastService.error("Не удалось загрузить рабочие пространства.", {
          details: state.error.details,
          correlationId: state.error.correlationId
        });
      }
    }),
    shareReplay({bufferSize: 1, refCount: true})
  );

  readonly selectedAccount$ = combineLatest({
    accountsState: this.accountsState$,
    accountId: this.accountContext.accountId$
  }).pipe(
    switchMap(({accountsState, accountId}) => {
      if (accountsState.status !== "ready") {
        return of(null);
      }
      const accounts = accountsState.data;
      const selected = accounts.find((account) => account.id === accountId) ?? accounts[0] ?? null;
      return of(selected);
    }),
    shareReplay({bufferSize: 1, refCount: true})
  );

  readonly detailsState$ = combineLatest({
    selectedAccount: this.selectedAccount$,
    refresh: this.refreshDetails$.pipe(startWith(void 0))
  }).pipe(
    switchMap(({selectedAccount}) => {
      if (!selectedAccount) {
        return of({
          status: "ready",
          data: {connections: [], members: []}
        } as LoadState<WorkspaceDetails, ApiError>);
      }
      return forkJoin({
        connections: this.connectionsApi.list(selectedAccount.id),
        members: this.membersApi.list(selectedAccount.id)
      }).pipe(toLoadState<WorkspaceDetails, ApiError>());
    }),
    tap((state) => {
      if (state.status === "error") {
        this.toastService.error("Не удалось загрузить данные workspace.", {
          details: state.error.details,
          correlationId: state.error.correlationId
        });
      }
    })
  );

  readonly vm$ = combineLatest({
    accountsState: this.accountsState$,
    selectedAccount: this.selectedAccount$,
    detailsState: this.detailsState$
  });

  constructor() {
    this.accountContext.accountId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((accountId) => {
        this.selectedAccountId = accountId;
        this.cdr.markForCheck();
      });
  }

  selectAccount(accountId: number): void {
    this.accountContext.setAccountId(accountId);
    this.refreshDetails$.next();
  }

  refreshAccounts(): void {
    this.refreshAccounts$.next();
  }

  refreshDetails(): void {
    this.refreshDetails$.next();
  }

  openCreateModal(): void {
    this.createForm.reset({name: "", active: true});
    this.createModalVisible = true;
  }

  closeCreateModal(): void {
    this.createModalVisible = false;
    this.createForm.reset({name: "", active: true});
  }

  openRenameModal(account: AccountResponse): void {
    this.renamingAccount = account;
    this.renameForm.reset({name: account.name});
    this.renameModalVisible = true;
  }

  closeRenameModal(): void {
    this.renameModalVisible = false;
    this.renamingAccount = null;
    this.renameForm.reset({name: ""});
  }

  submitCreate(): void {
    if (this.createForm.invalid || this.saving) {
      this.createForm.markAllAsTouched();
      return;
    }
    const {name, active} = this.createForm.getRawValue();
    this.saving = true;
    this.accountsApi
      .create({name: name.trim(), active})
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((account) => {
          this.toastService.success("Workspace создан.");
          this.accountContext.setAccountId(account.id);
          this.refreshAccounts$.next();
          this.refreshDetails$.next();
          this.closeCreateModal();
        }),
        tap({
          error: (error: ApiError) => {
            this.toastService.error("Не удалось создать workspace.", {
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

  submitRename(): void {
    if (this.renameForm.invalid || this.saving || !this.renamingAccount) {
      this.renameForm.markAllAsTouched();
      return;
    }
    const {name} = this.renameForm.getRawValue();
    const update: AccountUpdateRequest = {
      name: name.trim(),
      active: this.renamingAccount.active
    };
    this.saving = true;
    this.accountsApi
      .update(this.renamingAccount.id, update)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          this.toastService.success("Workspace обновлён.");
          this.refreshAccounts$.next();
          this.refreshDetails$.next();
          this.closeRenameModal();
        }),
        tap({
          error: (error: ApiError) => {
            this.toastService.error("Не удалось обновить workspace.", {
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

  toggleActive(account: AccountResponse): void {
    if (this.saving) {
      return;
    }
    const update: AccountUpdateRequest = {
      name: account.name,
      active: !account.active
    };
    this.saving = true;
    this.accountsApi
      .update(account.id, update)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          this.toastService.success("Статус workspace обновлён.");
          this.refreshAccounts$.next();
        }),
        tap({
          error: (error: ApiError) => {
            this.toastService.error("Не удалось обновить workspace.", {
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

  deleteWorkspace(account: AccountResponse): void {
    if (this.saving) {
      return;
    }
    const confirmed = window.confirm("Удалить workspace? Это действие необратимо.");
    if (!confirmed) {
      return;
    }
    this.saving = true;
    this.accountsApi
      .remove(account.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          this.toastService.success("Workspace удалён.");
          if (this.accountContext.snapshot === account.id) {
            this.accountContext.clear();
          }
          this.refreshAccounts$.next();
          this.refreshDetails$.next();
        }),
        tap({
          error: (error: ApiError) => {
            this.toastService.error("Не удалось удалить workspace.", {
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
}
