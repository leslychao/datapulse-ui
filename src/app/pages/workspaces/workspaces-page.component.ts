import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute, Router} from "@angular/router";
import {combineLatest, forkJoin, of, Subject, switchMap, timer} from "rxjs";
import {catchError, filter, finalize, map, shareReplay, startWith, take, tap, timeout} from "rxjs/operators";
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
  AccountUpdateRequest,
  Marketplace
} from "../../shared/models";
import {AccountContextService} from "../../core/state";
import {accountIdFromRoute} from "../../core/routing/account-id.util";
import {APP_PATHS} from "../../core/app-paths";
import {LastVisitedPathService} from "../../core/routing/last-visited-path.service";
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

type BadgeTone = "ok" | "muted";

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

type LifecycleAction = "archive" | "restore";

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
  private readonly lastVisitedPathService = inject(LastVisitedPathService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  saving = false;

  deleteDialogVisible = false;

  lifecycleDialogVisible = false;
  lifecycleAction: LifecycleAction | null = null;

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
          this.accountContext.setWorkspace({id: state.data[0].id, name: state.data[0].name});
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
        this.accountContext.setWorkspace({id: selected.id, name: selected.name});
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

  get lifecycleDialogTitle(): string {
    if (!this.selectedActionWorkspace || !this.lifecycleAction) {
      return "Change workspace status?";
    }
    return this.lifecycleAction === "archive" ? "Archive workspace?" : "Restore workspace?";
  }

  get lifecycleDialogDescription(): string {
    if (!this.selectedActionWorkspace || !this.lifecycleAction) {
      return "Изменить статус workspace.";
    }
    return this.lifecycleAction === "archive"
      ? "Workspace станет недоступен для синхронизаций и пользователей."
      : "Workspace снова станет доступен для синхронизаций и пользователей.";
  }

  get lifecycleDialogConfirmLabel(): string {
    return this.lifecycleAction === "restore" ? "Restore" : "Archive";
  }

  private waitUntilAccountAccessible(accountId: number) {
    return timer(0, 250).pipe(
      switchMap(() => this.iamApi.getAccessibleAccounts()),
      map((accounts) => accounts.some((account) => account.id === accountId)),
      filter((isAccessible) => isAccessible),
      take(1),
      timeout({first: 5_000}),
      map(() => void 0),
      catchError(() => {
        this.toastService.error(
          "Не удалось переключиться на workspace: доступ ещё не обновился. Обновите список и попробуйте снова."
        );
        this.refreshAccounts();
        return of(void 0);
      })
    );
  }

  refreshAccounts(): void {
    this.refreshAccounts$.next();
    this.refreshDetails$.next();
  }

  goToCreateWorkspace(): void {
    this.router.navigateByUrl(APP_PATHS.workspacesCreate);
  }

  openLifecycleDialog(account: AccountResponse): void {
    if (this.saving) {
      return;
    }
    this.selectedActionWorkspace = account;
    this.lifecycleAction = account.active ? "archive" : "restore";
    this.lifecycleDialogVisible = true;
  }

  closeLifecycleDialog(): void {
    this.lifecycleDialogVisible = false;
    this.lifecycleAction = null;
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

  applyLifecycleChange(): void {
    if (!this.selectedActionWorkspace || !this.lifecycleAction || this.saving) {
      return;
    }

    const account = this.selectedActionWorkspace;
    const shouldBeActive = this.lifecycleAction === "restore";

    const update: AccountUpdateRequest = {
      name: account.name,
      active: shouldBeActive
    };

    this.saving = true;

    this.accountsApi
    .update(account.id, update)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        this.toastService.success(shouldBeActive ? "Workspace восстановлен." : "Workspace архивирован.");
        this.refreshAccounts$.next();
        this.refreshDetails$.next();

        if (!shouldBeActive && this.accountContext.snapshot === account.id) {
          this.accountContext.clear();
        }

        this.closeLifecycleDialog();
      }),
      tap({
        error: (error: ApiError) => {
          this.toastService.error(
            shouldBeActive ? "Не удалось восстановить workspace." : "Не удалось архивировать workspace.",
            {details: error.details, correlationId: error.correlationId}
          );
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

  goToWorkspace(account: AccountResponse): void {
    if (!account.active) {
      this.toastService.info("Workspace архивирован. Откройте Settings или Restore, чтобы восстановить доступ.");
      return;
    }

    const accountId = account.id;
    const accountName = account.name;

    this.waitUntilAccountAccessible(accountId).subscribe(() => {
      if (this.accountContext.snapshot !== accountId) {
        this.accountContext.setWorkspace({id: accountId, name: accountName});
      }
      this.router.navigateByUrl(this.lastVisitedPathService.resolveAfterWorkspaceSwitch(accountId));
    });
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
      const prefix = marketplace === Marketplace.Wildberries ? "WB" : "Ozon";
      const label = items.length ? "Connected" : "No sources";
      const tone: BadgeTone = items.length ? "ok" : "muted";
      return {label: `${prefix}: ${label}`, tone};
    });
  }

  getWorkspaceLabel(account: AccountResponse): string {
    return account.active ? "Active" : "Archived";
  }
}
