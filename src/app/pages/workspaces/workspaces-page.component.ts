import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormBuilder, ReactiveFormsModule} from "@angular/forms";
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
import {AccountConnection, AccountMember, AccountResponse, AccountUpdateRequest} from "../../shared/models";
import {AccountContextService} from "../../core/state";
import {accountIdFromRoute} from "../../core/routing/account-id.util";
import {APP_PATHS} from "../../core/app-paths";
import {
  ButtonComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  FormFieldComponent,
  InputComponent,
  LoadingStateComponent,
  PageHeaderComponent,
  PageLayoutComponent,
  TableComponent,
  TableToolbarComponent,
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
    PageLayoutComponent,
    PageHeaderComponent,
    ButtonComponent,
    InputComponent,
    FormFieldComponent,
    TableComponent,
    TableToolbarComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    ConfirmDialogComponent
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
  deleteDialogVisible = false;
  archiveDialogVisible = false;
  selectedActionWorkspace: AccountResponse | null = null;

  private readonly refreshAccounts$ = new Subject<void>();
  private readonly refreshDetails$ = new Subject<void>();
  private readonly routeAccountId$ = accountIdFromRoute(this.route);

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

  constructor() {
    this.accountContext.accountId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.cdr.markForCheck();
      });
  }

  refreshAccounts(): void {
    this.refreshAccounts$.next();
    this.refreshDetails$.next();
  }

  goToCreateWorkspace(): void {
    this.router.navigateByUrl(APP_PATHS.workspacesCreate);
  }

  openArchiveDialog(account: AccountResponse): void {
    this.selectedActionWorkspace = account;
    this.archiveDialogVisible = true;
  }

  closeArchiveDialog(): void {
    this.archiveDialogVisible = false;
    this.selectedActionWorkspace = null;
  }

  openDeleteDialog(account: AccountResponse): void {
    this.selectedActionWorkspace = account;
    this.deleteDialogVisible = true;
  }

  closeDeleteDialog(): void {
    this.deleteDialogVisible = false;
    this.selectedActionWorkspace = null;
  }

  archiveWorkspace(): void {
    if (!this.selectedActionWorkspace || this.saving) {
      return;
    }
    const account = this.selectedActionWorkspace;
    const update: AccountUpdateRequest = {
      name: account.name,
      active: false
    };
    this.saving = true;
    this.accountsApi
      .update(account.id, update)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          this.toastService.success("Workspace архивирован.");
          this.refreshAccounts$.next();
          this.refreshDetails$.next();
          this.closeArchiveDialog();
        }),
        tap({
          error: (error: ApiError) => {
            this.toastService.error("Не удалось архивировать workspace.", {
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

  deleteWorkspace(): void {
    if (!this.selectedActionWorkspace || this.saving) {
      return;
    }
    const account = this.selectedActionWorkspace;
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
          this.closeDeleteDialog();
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

  goToWorkspace(accountId: number): void {
    this.accountContext.setAccountId(accountId);
    this.router.navigateByUrl(APP_PATHS.overview(accountId));
  }

  goToSettings(accountId: number): void {
    this.router.navigateByUrl(APP_PATHS.workspaceSettings(accountId));
  }

  goToConnections(accountId: number): void {
    this.router.navigateByUrl(APP_PATHS.connections(accountId));
  }

  goToUsers(accountId: number): void {
    this.router.navigateByUrl(APP_PATHS.users(accountId));
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

  canDelete(count: number): boolean {
    return count > 1;
  }
}
