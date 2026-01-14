import {Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {Observable} from "rxjs";

import {AccountContextService} from "../../core/state";
import {
  ChartCardComponent,
  DashboardShellComponent,
  FilterBarComponent,
  MetricTileGroupComponent
} from "../../shared/ui";
import {DashboardStateQuery, DashboardStateResult} from "../../queries/dashboard-state.query";
import {DATA_STATE} from "../../shared/models";
import {FilterFieldVm} from "../../vm/filter-field.vm";
import {MetricTileVm} from "../../vm/metric-tile.vm";

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
  styleUrl: "./finance-pnl-page.component.css"
})
export class FinancePnlPageComponent implements OnInit {
  accountId: number | null = null;
  state$?: Observable<DashboardStateResult>;

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

  constructor(
    private readonly route: ActivatedRoute,
    private readonly accountContext: AccountContextService,
    private readonly dashboardState: DashboardStateQuery
  ) {}

  ngOnInit(): void {
    const accountId = Number(this.route.snapshot.paramMap.get("accountId"));
    this.accountId = Number.isFinite(accountId) ? accountId : null;
    if (this.accountId != null) {
      this.accountContext.setAccountId(this.accountId);
    }
    this.state$ = this.dashboardState.getState(this.accountId, DATA_STATE.unavailable);
  }
}
