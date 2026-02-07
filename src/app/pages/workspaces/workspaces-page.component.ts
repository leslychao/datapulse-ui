import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
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
  AccountConnectionSyncStatus,
  AccountMember,
  AccountResponse,
  AccountUpdateRequest,
  Marketplace
} from "../../shared/models";
import {AccountContextService} from "../../core/state";
import {accountIdFromRoute} from "../../core/routing/account-id.util";
import {APP_PATHS} from "../../core/app-paths";
import {
  ButtonComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
  PageHeaderComponent,
  PageLayoutComponent,
  TableComponent,
  ToastService
} from "../../shared/ui";
import {LoadState, toLoadState} from "../../shared/operators/to-load-state";

interface WorkspaceDetails {
  connections: AccountConnection[];
  members: AccountMember[];
}

type WorkspaceDetailsByAccount = Record<number, WorkspaceDetails>;

type BadgeTone = "ok" | "warning" | "error" | "muted";

interface DataSourceBadge {
  label: string;
  tone: BadgeTone;
}

interface WorkspacesViewModel {
  accountsState: LoadState<AccountResponse[], ApiError>;
  selectedAccount: AccountResponse | null;
  detailsState: LoadState<WorkspaceDetailsByAccount, ApiError>;
  currentAccountId: number | null;
}

@Component({
  selector: "dp-workspaces-page",
  standalone: true,
  imports: [
    CommonModule,
    PageLayoutComponent,
    PageHeaderComponent,
    ButtonComponent,
    TableComponent,
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
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  saving = false;
  deleteDialogVisible = false;
  archiveDialogVisible = false;
  selectedActionWorkspace: AccountResponse | null = null;
  openActionMenuId: number | null = null;

  private readonly refreshAccounts$ = new Subject<void>();
  private readonly refreshDetails$ = new Subject<void>();
  private readonly routeAccountId$ = accountIdFromRoute(this.route);

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
    accountsState: this.accountsState$,
    refresh: this.refreshDetails$.pipe(startWith(void 0))
  }).pipe(
    switchMap(({accountsState}) => {
      if (accountsState.status !== "ready") {
        return of({status: "loading"} as LoadState<WorkspaceDetailsByAccount, ApiError>);
      }
      if (!accountsState.data.length) {
        return of({status: "ready", data: {}} as LoadState<WorkspaceDetailsByAccount, ApiError>);
      }
      return forkJoin(
        accountsState.data.map((account) =>
          forkJoin({
            connections: this.connectionsApi.list(account.id),
            members: this.membersApi.list(account.id)
          }).pipe(map((data) => ({accountId: account.id, data})))
        )
      ).pipe(
        map((items) =>
          items.reduce((acc, item) => {
            acc[item.accountId] = item.data;
            return acc;
          }, {} as WorkspaceDetailsByAccount)
        ),
        toLoadState<WorkspaceDetailsByAccount, ApiError>()
      );
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
    currentAccountId: this.accountContext.accountId$
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

  toggleActionMenu(accountId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedActionWorkspace = null;
    this.openActionMenuId = this.openActionMenuId === accountId ? null : accountId;
  }

  closeActionMenu(): void {
    this.openActionMenuId = null;
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
    this.accountContext
      .setCurrentWorkspace(accountId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          this.router.navigateByUrl(APP_PATHS.overview(accountId));
        }),
        tap({
          error: (error: ApiError) => {
            this.toastService.error("Не удалось переключить workspace.", {
              details: error.details,
              correlationId: error.correlationId
            });
          }
        })
      )
      .subscribe();
  }

  goToSettings(accountId: number): void {
    this.router.navigateByUrl(APP_PATHS.workspaceSettings(accountId));
  }

  goToConnections(accountId: number): void {
    this.router.navigateByUrl(APP_PATHS.connections(accountId));
  }

  canDelete(count: number): boolean {
    return count > 1;
  }

  getDetailsForAccount(
    accountId: number,
    detailsState: LoadState<WorkspaceDetailsByAccount, ApiError>
  ): WorkspaceDetails | null {
    if (detailsState.status !== "ready") {
      return null;
    }
    return detailsState.data[accountId] ?? null;
  }

  getMemberLabel(count: number): string {
    return count === 1 ? "1 member" : `${count} members`;
  }

  getDataSourceBadges(connections: AccountConnection[]): DataSourceBadge[] {
    const grouped = new Map<Marketplace, AccountConnection[]>();
    connections.forEach((connection) => {
      const items = grouped.get(connection.marketplace) ?? [];
      items.push(connection);
      grouped.set(connection.marketplace, items);
    });

    return Array.from(grouped.entries()).map(([marketplace, items]) => {
      const {label, tone} = this.getMarketplaceStatus(items);
      const prefix = marketplace === Marketplace.Wildberries ? "WB" : "Ozon";
      return {label: `${prefix}: ${label}`, tone};
    });
  }

  getConnectionStatusLabel(status: AccountConnectionSyncStatus): string {
    switch (status) {
      case AccountConnectionSyncStatus.Success:
        return "OK";
      case AccountConnectionSyncStatus.NoData:
        return "No data";
      case AccountConnectionSyncStatus.Failed:
        return "Error";
      default:
        return "Not synced";
    }
  }

  getMarketplaceStatus(connections: AccountConnection[]): DataSourceBadge {
    if (connections.some((connection) => connection.lastSyncStatus === AccountConnectionSyncStatus.Failed)) {
      return {label: "Error", tone: "error"};
    }
    if (connections.some((connection) => connection.lastSyncStatus === AccountConnectionSyncStatus.NoData)) {
      return {label: "No data", tone: "warning"};
    }
    if (connections.some((connection) => connection.lastSyncStatus === AccountConnectionSyncStatus.New)) {
      return {label: "Not synced", tone: "muted"};
    }
    return {label: "OK", tone: "ok"};
  }

  getIssuesCount(connections: AccountConnection[]): number {
    return connections.filter((connection) =>
      [AccountConnectionSyncStatus.Failed, AccountConnectionSyncStatus.NoData].includes(
        connection.lastSyncStatus
      )
    ).length;
  }

  getLastSyncSummary(connections: AccountConnection[]): {
    timestamp: string | null;
    statusLabel: string | null;
    reason: string;
  } {
    if (!connections.length) {
      return {timestamp: null, statusLabel: null, reason: "No sources"};
    }
    const withSync = connections.filter((connection) => connection.lastSyncAt);
    if (!withSync.length) {
      if (connections.some((connection) => connection.lastSyncStatus === AccountConnectionSyncStatus.Failed)) {
        return {timestamp: null, statusLabel: null, reason: "Sync error"};
      }
      if (connections.some((connection) => connection.lastSyncStatus === AccountConnectionSyncStatus.NoData)) {
        return {timestamp: null, statusLabel: null, reason: "No data"};
      }
      return {timestamp: null, statusLabel: null, reason: "Not started"};
    }
    const latest = withSync.sort((a, b) => a.lastSyncAt!.localeCompare(b.lastSyncAt!)).at(-1)!;
    return {
      timestamp: latest.lastSyncAt,
      statusLabel: this.getSyncStatusLabel(latest.lastSyncStatus),
      reason: ""
    };
  }

  getSyncStatusLabel(status: AccountConnectionSyncStatus): string {
    switch (status) {
      case AccountConnectionSyncStatus.Success:
        return "Success";
      case AccountConnectionSyncStatus.NoData:
        return "No data";
      case AccountConnectionSyncStatus.Failed:
        return "Sync error";
      default:
        return "Not started";
    }
  }

  getWorkspaceLabel(account: AccountResponse): string {
    return account.active ? "Active" : "Archived";
  }
}
