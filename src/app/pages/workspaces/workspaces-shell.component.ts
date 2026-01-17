import {ChangeDetectionStrategy, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute, Router, RouterModule} from "@angular/router";
import {combineLatest, distinctUntilChanged, map} from "rxjs";

import {ApiError} from "../../core/api";
import {APP_PATHS, APP_ROUTE_SEGMENTS} from "../../core/app-paths";
import {AccountCatalogService} from "../../core/state";
import {AccountSummary} from "../../shared/models";
import {LoadState, toLoadState} from "../../shared/operators/to-load-state";
import {LoaderComponent} from "../../shared/ui";

interface ShellViewModel {
  accountId: number | null;
  accounts: AccountSummary[];
  activeAccount: AccountSummary | null;
  invalidAccount: boolean;
  state: LoadState<AccountSummary[], ApiError>;
}

@Component({
  selector: "dp-workspaces-shell",
  standalone: true,
  imports: [CommonModule, RouterModule, LoaderComponent],
  templateUrl: "./workspaces-shell.component.html",
  styleUrl: "./workspaces-shell.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspacesShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountCatalog = inject(AccountCatalogService);
  readonly APP_PATHS = APP_PATHS;

  private readonly accountId$ = this.route.paramMap.pipe(
    map((params) => {
      const accountIdParam = params.get("accountId");
      if (accountIdParam == null) {
        return null;
      }
      const accountId = Number(accountIdParam);
      return Number.isFinite(accountId) ? accountId : null;
    }),
    distinctUntilChanged()
  );

  private readonly accountsState$ = this.accountCatalog
    .load()
    .pipe(toLoadState<AccountSummary[], ApiError>());

  readonly vm$ = combineLatest([this.accountId$, this.accountsState$]).pipe(
    map(([accountId, state]) => {
      const accounts = state.status === "ready" ? state.data : [];
      const activeAccount = accountId != null ? accounts.find((item) => item.id === accountId) ?? null : null;
      const invalidAccount = state.status === "ready" && (accountId == null || !activeAccount);
      return {
        accountId,
        accounts,
        activeAccount,
        invalidAccount,
        state
      } as ShellViewModel;
    })
  );

  onWorkspaceChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const accountId = Number(value);
    if (!Number.isFinite(accountId)) {
      return;
    }
    const targetTab = this.router.url.includes(`/${APP_ROUTE_SEGMENTS.connections}`)
      ? APP_ROUTE_SEGMENTS.connections
      : APP_ROUTE_SEGMENTS.users;
    this.router.navigateByUrl(
      targetTab === APP_ROUTE_SEGMENTS.connections
        ? APP_PATHS.settingsWorkspaceConnections(accountId)
        : APP_PATHS.settingsWorkspaceUsers(accountId)
    );
  }
}
