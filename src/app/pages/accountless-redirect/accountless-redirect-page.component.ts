import {ChangeDetectionStrategy, Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute, Router} from "@angular/router";

import {AccountCatalogService, AccountContextService} from "../../core/state";
import {LastVisitedPathService} from "../../core/routing/last-visited-path.service";
import {take} from "rxjs";
import {APP_PATHS, APP_ROUTE_SEGMENTS} from "../../core/app-paths";
import {LoaderComponent} from "../../shared/ui";

@Component({
  selector: "dp-accountless-redirect-page",
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  templateUrl: "./accountless-redirect-page.component.html",
  styleUrl: "./accountless-redirect-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountlessRedirectPageComponent implements OnInit {
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly accountContext: AccountContextService,
    private readonly accountCatalog: AccountCatalogService,
    private readonly lastVisitedPathService: LastVisitedPathService
  ) {}

  ngOnInit(): void {
    this.accountCatalog.load().pipe(take(1)).subscribe({
      next: (accounts) => {
        if (accounts.length === 0) {
          this.accountContext.clear();
          this.router.navigateByUrl(APP_PATHS.gettingStarted, {replaceUrl: true});
          return;
        }

        const contextAccountId = this.accountContext.snapshot;
        const matched = accounts.find((account) => account.id === contextAccountId) ?? accounts[0];

        this.accountContext.setWorkspace({id: matched.id, name: matched.name});
        const requestedSegments = this.route.snapshot.url.map((segment) => segment.path);
        if (requestedSegments.length === 0) {
          this.router.navigateByUrl(this.lastVisitedPathService.resolveHomePath(matched.id), {
            replaceUrl: true
          });
          return;
        }

        const suffix = requestedSegments.join("/");
        const target = `/${APP_ROUTE_SEGMENTS.app}/${matched.id}/${suffix}`;
        this.router.navigateByUrl(target, {replaceUrl: true});
      },
      error: () => {
        this.router.navigateByUrl(APP_PATHS.workspaces, {replaceUrl: true});
      }
    });
  }
}
