import {ChangeDetectionStrategy, Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {Observable} from "rxjs";

import {
  DashboardShellComponent,
  FilterBarComponent,
  MetricTileGroupComponent,
  ChartCardComponent,
  DataTableCardComponent
} from "../../shared/ui";
import {DashboardStateQuery, DashboardStateResult} from "../../queries/dashboard-state.query";
import {DATA_STATE} from "../../shared/models";
import {FilterFieldVm} from "../../vm/filter-field.vm";
import {MetricTileVm} from "../../vm/metric-tile.vm";
import {TableColumnVm} from "../../vm/table-column.vm";

@Component({
  selector: "dp-operations-returns-page",
  standalone: true,
  imports: [
    CommonModule,
    DashboardShellComponent,
    FilterBarComponent,
    MetricTileGroupComponent,
    ChartCardComponent,
    DataTableCardComponent
  ],
  templateUrl: "./operations-returns-page.component.html",
  styleUrl: "./operations-returns-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationsReturnsPageComponent implements OnInit {
  accountId: number | null = null;
  state$?: Observable<DashboardStateResult>;

  readonly filters: FilterFieldVm[] = [
    {id: "account", label: "Account", type: "select", options: [{label: "Все аккаунты", value: "all"}]},
    {id: "from", label: "Date from", type: "date"},
    {id: "to", label: "Date to", type: "date"},
    {id: "marketplace", label: "Marketplace", type: "select", options: [{label: "Все", value: "all"}]}
  ];

  readonly tiles: MetricTileVm[] = [
    {id: "buyout", label: "Buyout %", value: "—"},
    {id: "returnLosses", label: "Return losses", value: "—", semantic: "loss"},
    {id: "returnsCount", label: "Returns count", value: "—"},
    {id: "pnlImpact", label: "P&L impact", value: "—", semantic: "loss"}
  ];

  readonly problemColumns: TableColumnVm[] = [
    {key: "reason", label: "Problem area", sortable: true},
    {key: "share", label: "Share", sortable: true, align: "right"},
    {key: "impact", label: "Impact", sortable: true, align: "right"}
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly dashboardState: DashboardStateQuery
  ) {}

  ngOnInit(): void {
    const accountId = Number(this.route.snapshot.paramMap.get("accountId"));
    this.accountId = Number.isFinite(accountId) ? accountId : null;
    this.state$ = this.dashboardState.getState(this.accountId, DATA_STATE.unavailable);
  }
}
