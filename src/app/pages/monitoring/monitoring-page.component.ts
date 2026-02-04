import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute, Router} from "@angular/router";
import {Subject, map, of, switchMap} from "rxjs";
import {finalize, startWith, tap} from "rxjs/operators";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AccountConnectionsApiClient, ApiError} from "../../core/api";
import {AccountConnection, AccountConnectionSyncStatus} from "../../shared/models";
import {accountIdFromRoute} from "../../core/routing/account-id.util";
import {APP_PATHS} from "../../core/app-paths";
import {
  ButtonComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
  PageHeaderComponent,
  PageLayoutComponent,
  TableComponent,
  TableToolbarComponent,
  ToastService
} from "../../shared/ui";
import {LoadState, toLoadState} from "../../shared/operators/to-load-state";

interface MonitoringViewModel {
  accountId: number | null;
  state: LoadState<AccountConnection[], ApiError>;
}

@Component({
  selector: "dp-monitoring-page",
  standalone: true,
  imports: [
    CommonModule,
    PageLayoutComponent,
    PageHeaderComponent,
    TableComponent,
    TableToolbarComponent,
    ButtonComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    ErrorStateComponent
  ],
  templateUrl: "./monitoring-page.component.html",
  styleUrl: "./monitoring-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonitoringPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly connectionsApi = inject(AccountConnectionsApiClient);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly refresh$ = new Subject<void>();
  private readonly accountId$ = accountIdFromRoute(this.route);

  readonly vm$ = this.accountId$.pipe(
    switchMap((accountId) => {
      if (accountId == null) {
        return of({
          accountId,
          state: {status: "error", error: {status: 400, message: "Workspace is not selected."}}
        } as MonitoringViewModel);
      }
      return this.refresh$.pipe(
        startWith(void 0),
        switchMap(() =>
          this.connectionsApi.list(accountId).pipe(toLoadState<AccountConnection[], ApiError>())
        ),
        tap((state) => {
          if (state.status === "error") {
            this.toastService.error("Не удалось загрузить мониторинг.", {
              details: state.error.details,
              correlationId: state.error.correlationId
            });
          }
        }),
        map((state) => ({accountId, state}))
      );
    })
  );

  refresh(): void {
    this.refresh$.next();
  }

  retrySync(connection: AccountConnection, accountId: number | null): void {
    if (accountId == null) {
      return;
    }
    this.connectionsApi
      .update(accountId, connection.id, {active: true})
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          this.toastService.success("Повтор синхронизации запущен.");
          this.refresh$.next();
        }),
        tap({
          error: (error: ApiError) => {
            this.toastService.error("Не удалось повторить синхронизацию.", {
              details: error.details,
              correlationId: error.correlationId
            });
          }
        }),
        finalize(() => {
          this.cdr.markForCheck();
        })
      )
      .subscribe();
  }

  openConnection(accountId: number | null): void {
    if (accountId == null) {
      return;
    }
    this.router.navigateByUrl(APP_PATHS.connections(accountId));
  }

  statusLabel(connection: AccountConnection): string {
    if (!connection.active) {
      return "Disabled";
    }
    if (connection.lastSyncStatus === AccountConnectionSyncStatus.Failed) {
      return "Needs attention";
    }
    if (connection.lastSyncStatus === AccountConnectionSyncStatus.New) {
      return "Syncing";
    }
    return "Healthy";
  }

  statusDescription(connection: AccountConnection): string {
    if (!connection.active) {
      return "Синхронизация остановлена.";
    }
    if (connection.lastSyncStatus === AccountConnectionSyncStatus.Failed) {
      return "Ошибка синхронизации. Проверьте credentials.";
    }
    if (connection.lastSyncStatus === AccountConnectionSyncStatus.New) {
      return "Идёт первичная синхронизация.";
    }
    return "Данные обновляются регулярно.";
  }

  freshnessLabel(connection: AccountConnection): string {
    if (!connection.lastSyncAt) {
      return "No sync yet";
    }
    const last = new Date(connection.lastSyncAt).getTime();
    const hours = Math.floor((Date.now() - last) / 3600000);
    if (hours < 6) {
      return "Fresh";
    }
    if (hours < 24) {
      return `Updated ${hours}h ago`;
    }
    return "Stale";
  }
}
