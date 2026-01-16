import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {Observable, of} from "rxjs";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {catchError, finalize, map} from "rxjs/operators";

import {
  ChartCardComponent,
  DashboardShellComponent,
  FilterBarComponent,
  MetricTileGroupComponent
} from "../../shared/ui";
import {DashboardStateQuery, DashboardStateResult} from "../../queries/dashboard-state.query";
import {DATA_STATE, OrderPnlResponse, PageResponse} from "../../shared/models";
import {FilterFieldVm} from "../../vm/filter-field.vm";
import {MetricTileVm} from "../../vm/metric-tile.vm";
import {OrderPnlApi} from "../../core/api";

@Component({
  selector: "dp-finance-pnl-page",
  standalone: true,
  imports: [
    CommonModule,
    DashboardShellComponent,
    FilterBarComponent,
    MetricTileGroupComponent,
    ChartCardComponent
  ],
  templateUrl: "./finance-pnl-page.component.html",
  styleUrl: "./finance-pnl-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinancePnlPageComponent implements OnInit {
  accountId: number | null = null;
  state$?: Observable<DashboardStateResult>;
  orderPnl: OrderPnlResponse[] = [];
  isLoading = false;
  loadError: string | null = null;

  readonly filters: FilterFieldVm[] = [
    {id: "account", label: "Account", type: "select", options: [{label: "Все аккаунты", value: "all"}]},
    {id: "from", label: "Date from", type: "date"},
    {id: "to", label: "Date to", type: "date"},
    {
      id: "granularity",
      label: "Granularity",
      type: "select",
      options: [
        {label: "Day", value: "day"},
        {label: "Week", value: "week"},
        {label: "Month", value: "month"}
      ]
    },
    {id: "marketplace", label: "Marketplace", type: "select", options: [{label: "Все", value: "all"}]}
  ];

  readonly tiles: MetricTileVm[] = [
    {id: "revenue", label: "Revenue", value: "—"},
    {id: "commissions", label: "Commissions", value: "—"},
    {id: "logistics", label: "Logistics", value: "—"},
    {id: "ads", label: "Ads", value: "—"},
    {id: "penalties", label: "Penalties", value: "—"},
    {id: "returns", label: "Returns", value: "—"},
    {id: "netPayout", label: "Net payout", value: "—"},
    {id: "profit", label: "Profit", value: "—", semantic: "profit"}
  ];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly dashboardState: DashboardStateQuery,
    private readonly orderPnlApi: OrderPnlApi
  ) {}

  ngOnInit(): void {
    const accountId = Number(this.route.snapshot.paramMap.get("accountId"));
    this.accountId = Number.isFinite(accountId) ? accountId : null;
    if (this.accountId != null) {
      this.fetchOrderPnl();
    }
    this.state$ = this.dashboardState.getState(this.accountId, DATA_STATE.unavailable);
  }

  private fetchOrderPnl(): void {
    if (this.accountId == null) {
      return;
    }
    this.isLoading = true;
    this.loadError = null;
    this.orderPnlApi
      .list(this.accountId, {page: 0, size: 20})
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((response: PageResponse<OrderPnlResponse> | OrderPnlResponse[]) =>
          Array.isArray(response) ? response : response.content ?? []
        ),
        catchError(() => {
          this.loadError = "Не удалось загрузить данные по заказам.";
          return of([] as OrderPnlResponse[]);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe((rows) => {
        this.orderPnl = rows;
      });
  }
}
