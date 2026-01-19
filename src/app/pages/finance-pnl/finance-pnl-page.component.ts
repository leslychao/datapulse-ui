import {ChangeDetectionStrategy, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {combineLatest, of} from "rxjs";
import {map, switchMap} from "rxjs/operators";

import {
  ChartCardComponent,
  DashboardShellComponent,
  FilterBarComponent,
  MetricTileGroupComponent
} from "../../shared/ui";
import {DashboardStateQuery} from "../../queries/dashboard-state.query";
import {DATA_STATE, OrderPnlResponse, PageResponse} from "../../shared/models";
import {FilterFieldVm} from "../../vm/filter-field.vm";
import {MetricTileVm} from "../../vm/metric-tile.vm";
import {OrderPnlApiClient} from "../../core/api";
import {accountIdFromRoute} from "../../core/routing/account-id.util";
import {LoadState, toLoadState} from "../../shared/operators/to-load-state";

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
export class FinancePnlPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly dashboardState = inject(DashboardStateQuery);
  private readonly orderPnlApi = inject(OrderPnlApiClient);

  private readonly accountId$ = accountIdFromRoute(this.route);
  readonly vm$ = combineLatest({
    accountId: this.accountId$,
    state: this.accountId$.pipe(
      switchMap((accountId) => this.dashboardState.getState(accountId, DATA_STATE.unavailable))
    ),
    orderPnlState: this.accountId$.pipe(
      switchMap((accountId) => {
        if (accountId == null) {
          return of({
            status: "error",
            error: "Account is not selected."
          } as LoadState<OrderPnlResponse[], string>);
        }
        return this.orderPnlApi
          .list(accountId, {}, {page: 0, size: 20})
          .pipe(
            map((response: PageResponse<OrderPnlResponse>) => response.content ?? []),
            toLoadState<OrderPnlResponse[], string>(() => "Не удалось загрузить данные по заказам.")
          );
      })
    )
  }).pipe(map(({accountId, state, orderPnlState}) => ({accountId, state, orderPnlState})));

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

  constructor() {}

  getOrderPnlRows(state: LoadState<OrderPnlResponse[], string>): OrderPnlResponse[] {
    return state.status === "ready" ? state.data : [];
  }

  getOrderPnlError(state: LoadState<OrderPnlResponse[], string>): string | null {
    return state.status === "error" ? state.error : null;
  }
}
