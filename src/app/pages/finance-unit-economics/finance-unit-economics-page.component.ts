import {Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {Observable} from "rxjs";

import {AccountContextService} from "../../core/state";
import {
  DashboardShellComponent,
  FilterBarComponent,
  MetricTileGroupComponent,
  DataTableCardComponent
} from "../../shared/ui";
import {DashboardStateQuery, DashboardStateResult} from "../../queries/dashboard-state.query";
import {DATA_STATE} from "../../shared/models";
import {FilterFieldVm} from "../../vm/filter-field.vm";
import {MetricTileVm} from "../../vm/metric-tile.vm";
import {TableColumnVm} from "../../vm/table-column.vm";

@Component({
  selector: "dp-finance-unit-economics-page",
  standalone: true,
  imports: [
    CommonModule,
    DashboardShellComponent,
    FilterBarComponent,
    MetricTileGroupComponent,
    DataTableCardComponent
  ],
  templateUrl: "./finance-unit-economics-page.component.html",
  styleUrl: "./finance-unit-economics-page.component.css"
})
export class FinanceUnitEconomicsPageComponent implements OnInit {
  accountId: number | null = null;
  state$?: Observable<DashboardStateResult>;

  readonly filters: FilterFieldVm[] = [
    {id: "account", label: "Account", type: "select", options: [{label: "Все аккаунты", value: "all"}]},
    {id: "from", label: "Date from", type: "date"},
    {id: "to", label: "Date to", type: "date"},
    {id: "marketplace", label: "Marketplace", type: "select", options: [{label: "Все", value: "all"}]},
    {id: "search", label: "Search", type: "search", placeholder: "SKU или название"}
  ];

  readonly kpis: MetricTileVm[] = [
    {id: "avgMargin", label: "Avg margin / unit", value: "—", semantic: "profit"},
    {id: "topLoss", label: "Top loss SKUs", value: "—", semantic: "loss"}
  ];

  readonly columns: TableColumnVm[] = [
    {key: "sku", label: "SKU", sortable: true},
    {key: "name", label: "Product", sortable: true},
    {key: "units", label: "Units", sortable: true, align: "right"},
    {key: "margin", label: "Margin / unit", sortable: true, align: "right", semantic: "profitLoss"}
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
