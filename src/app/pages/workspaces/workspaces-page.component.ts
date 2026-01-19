import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {ActivatedRoute, Router} from "@angular/router";
import {combineLatest, forkJoin, of, Subject, switchMap} from "rxjs";
import {finalize, map, shareReplay, startWith, tap} from "rxjs/operators";
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
import {accountIdFromRoute} from "../../core/routing/account-id.util";
import {APP_PATHS} from "../../core/app-paths";
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
  filteredAccounts: AccountResponse[];
  selectedAccount: AccountResponse | null;
  detailsState: LoadState<WorkspaceDetails, ApiError>;
  search: string;
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  saving = false;
  createModalVisible = false;
  renameModalVisible = false;
  renamingAccount: AccountResponse | null = null;

  private readonly refreshAccounts$ = new Subject<void>();
  private readonly refreshDetails$ = new Subject<void>();
  private readonly routeAccountId$ = accountIdFromRoute(this.route);

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

  readonly searchControl = this.fb.nonNullable.control("");

  readonly accountsState$ = this.refreshAccounts$.pipe(
    startWith(void 0),
    switchMap(() =>
      this.iamApi.getAccessibleAccounts().pipe(toLoadState<AccountResponse[], ApiError>())
    ),
    tap((state) => {
      if (state.status === "ready") {
        const currentId = this.accountContext.snapshot;
        const hasSelection = state.data.some((account) => account.id === currentId);
        if (!hasSelection && state.data.length > 0) {
          this.accountContext.setAccountId(state.data[0].id);
        }
        if (state.data.length === 0) {
          this.accountContext.clear();
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
    routeAccountId: this.routeAccountId$,
    contextAccountId: this.accountContext.accountId$
  }).pipe(
    map(({accountsState, routeAccountId, contextAccountId}) => {
      if (accountsState.status !== "ready") {
        return null;
      }
      const accounts = accountsState.data;
      return (
        accounts.find((account) => account.id === routeAccountId) ??
        accounts.find((account) => account.id === contextAccountId) ??
        accounts[0] ??
        null
      );
    }),
    tap((selected) => {
      if (!selected) {
        return;
      }
      if (this.accountContext.snapshot !== selected.id) {
        this.accountContext.setAccountId(selected.id);
      }
      const routeParam = this.route.snapshot.paramMap.get("accountId");
      if (routeParam !== String(selected.id)) {
        this.router.navigate([APP_PATHS.workspaces, selected.id], {replaceUrl: true});
      }
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
    detailsState: this.detailsState$,
    filteredAccounts: combineLatest({
      accountsState: this.accountsState$,
      search: this.searchControl.valueChanges.pipe(startWith(""))
    }).pipe(
      map(({accountsState, search}) => {
        if (accountsState.status !== "ready") {
          return [];
        }
        const normalized = search.trim().toLowerCase();
        if (!normalized) {
          return accountsState.data;
        }
        return accountsState.data.filter((account) =>
          account.name.toLowerCase().includes(normalized)
        );
      })
    ),
    search: this.searchControl.valueChanges.pipe(startWith(""))
  });

  constructor() {}

  selectAccount(accountId: number): void {
    if (accountId === this.accountContext.snapshot) {
      return;
    }
    this.accountContext.setAccountId(accountId);
    this.refreshDetails$.next();
    this.router.navigate([APP_PATHS.workspaces, accountId]);
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

  navigateToConnections(accountId: number): void {
    this.router.navigateByUrl(APP_PATHS.settingsConnections(accountId));
  }

  navigateToMembers(accountId: number): void {
    this.router.navigateByUrl(APP_PATHS.settingsUsers(accountId));
  }

  getLastSyncAt(connections: AccountConnection[]): string | null {
    if (!connections.length) {
      return null;
    }
    const timestamps = connections
      .map((connection) => connection.lastSyncAt)
      .filter((value): value is string => Boolean(value));
    if (!timestamps.length) {
      return null;
    }
    return timestamps.sort().at(-1) ?? null;
  }
}
