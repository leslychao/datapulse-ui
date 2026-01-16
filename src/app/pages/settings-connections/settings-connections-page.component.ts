import {ChangeDetectionStrategy, Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";

import {ConnectionsQuery} from "../../queries/connections.query";
import {DashboardShellComponent, DataTableCardComponent} from "../../shared/ui";
import {TableColumnVm} from "../../vm/table-column.vm";
import {DataTableRow} from "../../shared/ui/data-table-card/data-table-card.component";
import {DataState} from "../../shared/models";

@Component({
  selector: "dp-settings-connections-page",
  standalone: true,
  imports: [CommonModule, DashboardShellComponent, DataTableCardComponent],
  templateUrl: "./settings-connections-page.component.html",
  styleUrl: "./settings-connections-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsConnectionsPageComponent implements OnInit {
  accountId: number | null = null;
  connections$?: Observable<{state: DataState; rows: DataTableRow[]}>;

  readonly columns: TableColumnVm[] = [
    {key: "marketplace", label: "Marketplace", sortable: true},
    {key: "active", label: "Active", sortable: true},
    {key: "lastSyncStatus", label: "Last sync status", sortable: true},
    {key: "lastSyncAt", label: "Last sync", sortable: true},
    {key: "maskedCredentials", label: "Credentials", sortable: false}
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly connectionsQuery: ConnectionsQuery
  ) {}

  ngOnInit(): void {
    const accountId = Number(this.route.snapshot.paramMap.get("accountId"));
    this.accountId = Number.isFinite(accountId) ? accountId : null;
    this.connections$ = this.connectionsQuery.load(this.accountId).pipe(
      map((result) => ({
        state: result.state,
        rows: result.data.map((connection) => ({
          marketplace: connection.marketplace,
          active: connection.active ? "Yes" : "No",
          lastSyncStatus: connection.lastSyncStatus,
          lastSyncAt: connection.lastSyncAt,
          maskedCredentials: connection.maskedCredentials
        }))
      }))
    );
  }
}
