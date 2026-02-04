import {ChangeDetectionStrategy, Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute, Router} from "@angular/router";

import {AccountContextService} from "../../core/state";
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
    private readonly accountContext: AccountContextService
  ) {}

  ngOnInit(): void {
    const accountId = this.accountContext.snapshot;
    if (accountId == null) {
      this.router.navigateByUrl(APP_PATHS.workspaces, {replaceUrl: true});
      return;
    }

    const requestedSegments = this.route.snapshot.url.map((segment) => segment.path);
    const target = `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${requestedSegments.join("/")}`;
    this.router.navigateByUrl(target, {replaceUrl: true});
  }
}
