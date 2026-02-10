import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute, Router} from "@angular/router";
import {HttpClient} from "@angular/common/http";
import {Subject, map, of, switchMap} from "rxjs";
import {finalize, startWith, tap} from "rxjs/operators";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AccountConnectionsApiClient, ApiError} from "../../core/api";
import {AccountConnection} from "../../shared/models";
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

type EtlEventCode =
  | "WAREHOUSE_DICT"
  | "CATEGORY_DICT"
  | "TARIFF_DICT"
  | "PRODUCT_DICT"
  | "SALES_FACT"
  | "INVENTORY_FACT"
  | "FACT_FINANCE";

type EtlDateMode = "LAST_DAYS";

interface EtlScenarioRunEvent {
  event: EtlEventCode;
  dateMode: EtlDateMode;
  lastDays: number;
}

interface EtlScenarioRunRequest {
  accountId: number;
  events: EtlScenarioRunEvent[];
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
  private readonly http = inject(HttpClient);
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

  runScenarioSync(accountId: number | null): void {
    if (accountId == null) {
      return;
    }

    const request: EtlScenarioRunRequest = {
      accountId,
      events: [
        {event: "WAREHOUSE_DICT", dateMode: "LAST_DAYS", lastDays: 30},
        {event: "CATEGORY_DICT", dateMode: "LAST_DAYS", lastDays: 30},
        {event: "TARIFF_DICT", dateMode: "LAST_DAYS", lastDays: 30},
        {event: "PRODUCT_DICT", dateMode: "LAST_DAYS", lastDays: 7},
        {event: "SALES_FACT", dateMode: "LAST_DAYS", lastDays: 7},
        {event: "INVENTORY_FACT", dateMode: "LAST_DAYS", lastDays: 7},
        {event: "FACT_FINANCE", dateMode: "LAST_DAYS", lastDays: 7}
      ]
    };

    this.http
    .post<void>("/api/etl/scenario/run", request)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        this.toastService.success("Синхронизация запущена.");
        this.refresh$.next();
      }),
      tap({
        error: (error: ApiError) => {
          this.toastService.error("Не удалось запустить синхронизацию.", {
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
    return connection.active ? "Enabled" : "Disabled";
  }

  statusDescription(connection: AccountConnection): string {
    return connection.active
      ? "Подключение активно. Запуск синхронизации доступен."
      : "Подключение отключено. Включите его в Connections.";
  }
}
