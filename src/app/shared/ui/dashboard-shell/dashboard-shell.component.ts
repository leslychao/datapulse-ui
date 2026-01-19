import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {CommonModule} from "@angular/common";
import {RouterModule} from "@angular/router";
import {APP_PATHS} from "../../../core/app-paths";

interface SidebarItem {
  label: string;
  path: string;
  testId: string;
}

interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

@Component({
  selector: "dp-dashboard-shell",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./dashboard-shell.component.html",
  styleUrl: "./dashboard-shell.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardShellComponent {
  private cachedAccountId: number | null = null;
  private cachedSections: SidebarSection[] = this.buildSections(null);

  @Input() title = "";
  @Input() subtitle = "";

  private _accountId: number | null = null;

  @Input()
  set accountId(value: number | null) {
    this._accountId = value;
    if (this.cachedAccountId !== value) {
      this.cachedAccountId = value;
      this.cachedSections = this.buildSections(value);
    }
  }

  get accountId(): number | null {
    return this._accountId;
  }

  get sections(): SidebarSection[] {
    return this.cachedSections;
  }

  trackBySection = (_: number, section: SidebarSection): string => section.label;

  trackByItem = (_: number, item: SidebarItem): string => item.testId;

  private buildSections(accountId: number | null): SidebarSection[] {
    if (accountId == null) {
      const fallback = APP_PATHS.selectAccount;
      return [
        {
          label: "Overview",
          items: [{label: "Home", path: fallback, testId: "sidebar-overview"}]
        }
      ];
    }

    return [
      {
        label: "Overview",
        items: [{label: "Home / Summary", path: APP_PATHS.homeSummary(accountId), testId: "sidebar-overview"}]
      },
      {
        label: "Finance",
        items: [
          {label: "P&L (Account)", path: APP_PATHS.financePnl(accountId), testId: "sidebar-finance-pnl"},
          {label: "Unit Economics (SKU)", path: APP_PATHS.financeUnitEconomics(accountId), testId: "sidebar-finance-unit"}
        ]
      },
      {
        label: "Operations",
        items: [
          {
            label: "Inventory & DoC",
            path: APP_PATHS.operationsInventory(accountId),
            testId: "sidebar-operations-inventory"
          },
          {
            label: "Returns & Buyout",
            path: APP_PATHS.operationsReturns(accountId),
            testId: "sidebar-operations-returns"
          },
          {
            label: "Sales / Orders Monitoring",
            path: APP_PATHS.operationsSalesMonitoring(accountId),
            testId: "sidebar-operations-sales"
          }
        ]
      },
      {
        label: "Marketing",
        items: [{label: "Ads / Marketing", path: APP_PATHS.marketingAds(accountId), testId: "sidebar-marketing-ads"}]
      },
      {
        label: "Data Health",
        items: [
          {
            label: "Data Freshness / SLA",
            path: APP_PATHS.dataHealthFreshness(accountId),
            testId: "sidebar-data-freshness"
          }
        ]
      },
      {
        label: "WORKSPACE",
        items: [
          {
            label: "Connections",
            path: APP_PATHS.settingsConnections(accountId),
            testId: "sidebar-settings-connections"
          },
          {
            label: "Users & Access",
            path: APP_PATHS.settingsUsers(accountId),
            testId: "sidebar-settings-users"
          }
        ]
      }
    ];
  }
}
