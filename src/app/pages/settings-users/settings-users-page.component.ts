import {ChangeDetectionStrategy, Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";

import {MembersQuery} from "../../queries/members.query";
import {DashboardShellComponent, DataTableCardComponent} from "../../shared/ui";
import {TableColumnVm} from "../../vm/table-column.vm";
import {DataTableRow} from "../../shared/ui/data-table-card/data-table-card.component";
import {DataState} from "../../shared/models";

@Component({
  selector: "dp-settings-users-page",
  standalone: true,
  imports: [CommonModule, DashboardShellComponent, DataTableCardComponent],
  templateUrl: "./settings-users-page.component.html",
  styleUrl: "./settings-users-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsUsersPageComponent implements OnInit {
  accountId: number | null = null;
  members$?: Observable<{state: DataState; rows: DataTableRow[]}>;

  readonly columns: TableColumnVm[] = [
    {key: "name", label: "User", sortable: true},
    {key: "email", label: "Email", sortable: true},
    {key: "role", label: "Role", sortable: true}
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly membersQuery: MembersQuery
  ) {}

  ngOnInit(): void {
    const accountId = Number(this.route.snapshot.paramMap.get("accountId"));
    this.accountId = Number.isFinite(accountId) ? accountId : null;
    this.members$ = this.membersQuery.load(this.accountId).pipe(
      map((result) => ({
        state: result.state,
        rows: result.data.map((member) => ({
          name: member.name,
          email: member.email,
          role: member.role
        }))
      }))
    );
  }
}
