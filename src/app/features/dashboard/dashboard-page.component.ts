import {Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute, RouterModule} from "@angular/router";
import {AccountContextService} from "../../core/account/account-context.service";
import {APP_PATHS} from "../../core/app-paths";

@Component({
  selector: "dp-dashboard-page",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./dashboard-page.component.html",
  styleUrl: "./dashboard-page.component.css"
})
export class DashboardPageComponent implements OnInit {
  accountId: number | null = null;

  readonly adminConnectionsPath = (id: number) => APP_PATHS.adminConnections(id);
  readonly adminTeamPath = (id: number) => APP_PATHS.adminTeam(id);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly accountContext: AccountContextService
  ) {}

  ngOnInit(): void {
    const accountId = Number(this.route.snapshot.paramMap.get("accountId"));
    this.accountId = Number.isFinite(accountId) ? accountId : null;
    if (this.accountId != null) {
      this.accountContext.setAccountId(this.accountId);
    }
  }
}
