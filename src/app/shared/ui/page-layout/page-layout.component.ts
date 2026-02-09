import {ChangeDetectionStrategy, Component, DestroyRef, Input, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {RouterModule} from "@angular/router";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {APP_PATHS} from "../../../core/app-paths";
import {AccountContextService} from "../../../core/state";

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
  selector: "dp-page-layout",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./page-layout.component.html",
  styleUrl: "./page-layout.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageLayoutComponent {
  private readonly accountContext = inject(AccountContextService);
  private readonly destroyRef = inject(DestroyRef);

  private cachedEffectiveAccountId: number | null = null;
  private cachedSections: SidebarSection[] = this.buildSections(null);

  private _accountId: number | null = null;

  @Input()
  set accountId(value: number | null) {
    this._accountId = value;
    this.rebuildIfNeeded();
  }

  get accountId(): number | null {
    return this._accountId;
  }

  get sections(): SidebarSection[] {
    return this.cachedSections;
  }

  trackBySection = (_: number, section: SidebarSection): string => section.label;

  trackByItem = (_: number, item: SidebarItem): string => item.testId;

  constructor() {
    // Если страница не передала accountId (например, /profile), используем текущий workspace из контекста
    // и обновляем меню при смене текущего workspace.
    this.accountContext.accountId$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(() => {
      if (this._accountId == null) {
        this.rebuildIfNeeded();
      }
    });
  }

  private rebuildIfNeeded(): void {
    const effectiveAccountId = this._accountId ?? this.accountContext.snapshot;
    if (this.cachedEffectiveAccountId === effectiveAccountId) {
      return;
    }
    this.cachedEffectiveAccountId = effectiveAccountId;
    this.cachedSections = this.buildSections(effectiveAccountId);
  }

  private buildSections(accountId: number | null): SidebarSection[] {
    if (accountId == null) {
      return [
        {
          label: "Workspace",
          items: [{label: "My Workspaces", path: APP_PATHS.workspaces, testId: "sidebar-workspaces"}]
        }
      ];
    }

    return [
      {
        label: "Workspace",
        items: [
          {
            label: "Connections",
            path: APP_PATHS.connections(accountId),
            testId: "sidebar-connections"
          },
          {
            label: "Users & Access",
            path: APP_PATHS.users(accountId),
            testId: "sidebar-users"
          },
          {
            label: "Settings",
            path: APP_PATHS.workspaceSettings(accountId),
            testId: "sidebar-workspace-settings"
          }
        ]
      },
      {
        label: "Data & Dashboards",
        items: [
          {
            label: "Analytics overview",
            path: APP_PATHS.overview(accountId),
            testId: "sidebar-data-overview"
          },
          {label: "P&L", path: APP_PATHS.financePnl(accountId), testId: "sidebar-finance-pnl"},
          {
            label: "Unit economics",
            path: APP_PATHS.financeUnitEconomics(accountId),
            testId: "sidebar-finance-unit"
          },
          {
            label: "Inventory",
            path: APP_PATHS.operationsInventory(accountId),
            testId: "sidebar-operations-inventory"
          },
          {
            label: "Returns & buyout",
            path: APP_PATHS.operationsReturns(accountId),
            testId: "sidebar-operations-returns"
          },
          {
            label: "Sales monitoring",
            path: APP_PATHS.operationsSalesMonitoring(accountId),
            testId: "sidebar-operations-sales"
          },
          {
            label: "Marketing",
            path: APP_PATHS.marketingAds(accountId),
            testId: "sidebar-marketing-ads"
          },
          {
            label: "Data freshness",
            path: APP_PATHS.monitoring(accountId),
            testId: "sidebar-monitoring"
          }
        ]
      }
    ];
  }
}
