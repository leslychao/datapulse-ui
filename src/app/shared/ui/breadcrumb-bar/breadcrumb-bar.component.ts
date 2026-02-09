import {ChangeDetectionStrategy, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {NavigationEnd, Router} from "@angular/router";
import {combineLatest, Observable} from "rxjs";
import {filter, map, startWith} from "rxjs/operators";

import {AccountCatalogService, AccountContextService} from "../../../core/state";

type BreadcrumbItem = {
  label: string;
};

type BreadcrumbVm = {
  items: readonly BreadcrumbItem[];
} | null;

@Component({
  selector: "dp-breadcrumb-bar",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./breadcrumb-bar.component.html",
  styleUrl: "./breadcrumb-bar.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BreadcrumbBarComponent {
  private readonly router = inject(Router);
  private readonly accountContext = inject(AccountContextService);
  private readonly accountCatalog = inject(AccountCatalogService);

  readonly vm$: Observable<BreadcrumbVm> = combineLatest([
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url)
    ),
    this.accountCatalog.state$
  ]).pipe(
    map(([url, catalogState]) => this.buildVm(url, catalogState.accounts ?? []))
  );

  private buildVm(url: string, accounts: readonly {id: number; name: string}[]): BreadcrumbVm {
    const canonicalUrl = this.stripQueryAndHash(url);

    if (canonicalUrl === "" || canonicalUrl === "/" || canonicalUrl.startsWith("/login")) {
      return null;
    }

    if (canonicalUrl === "/profile") {
      return {items: [{label: "Profile"}]};
    }

    if (canonicalUrl.startsWith("/workspaces")) {
      const segments = canonicalUrl.split("/").filter(Boolean);
      if (segments.length >= 2 && segments[1] === "create") {
        return {items: [{label: "Workspaces"}, {label: "Create"}]};
      }
      return {items: [{label: "Workspaces"}]};
    }

    if (canonicalUrl.startsWith("/getting-started")) {
      return {items: [{label: "Getting started"}]};
    }

    if (!canonicalUrl.startsWith("/app/")) {
      return null;
    }

    const segments = canonicalUrl.split("/").filter(Boolean);
    const accountId = this.accountContext.snapshot;
    const workspaceName =
      accountId == null
        ? "Workspace"
        : accounts.find((item) => item.id === accountId)?.name ?? "Workspace";

    const sectionSegments = segments.slice(2);
    const items: BreadcrumbItem[] = [{label: workspaceName}];

    const routeLabels = this.mapRouteToLabels(sectionSegments);
    for (const label of routeLabels) {
      items.push({label});
    }

    return items.length ? {items} : null;
  }

  private mapRouteToLabels(sectionSegments: readonly string[]): readonly string[] {
    if (sectionSegments.length === 0) {
      return [];
    }

    const [root, child] = sectionSegments;
    switch (root) {
      case "connections":
        return ["Connections"];
      case "users":
        return ["Users & Access"];
      case "settings":
        if (child === "profile") {
          return ["Settings", "Profile"];
        }
        return ["Settings"];
      case "overview":
        return ["Analytics overview"];
      case "monitoring":
        return ["Data freshness"];
      case "finance":
        if (child === "pnl") {
          return ["P&L"];
        }
        if (child === "unit-economics") {
          return ["Unit economics"];
        }
        return ["Finance"];
      case "operations":
        if (child === "inventory") {
          return ["Inventory"];
        }
        if (child === "returns-buyout") {
          return ["Returns & buyout"];
        }
        if (child === "sales-monitoring") {
          return ["Sales monitoring"];
        }
        return ["Operations"];
      case "marketing":
        if (child === "ads") {
          return ["Marketing"];
        }
        return ["Marketing"];
      default:
        return [];
    }
  }

  private stripQueryAndHash(url: string): string {
    const queryIndex = url.indexOf("?");
    const hashIndex = url.indexOf("#");

    const cutIndex =
      queryIndex === -1
        ? hashIndex
        : hashIndex === -1
          ? queryIndex
          : Math.min(queryIndex, hashIndex);

    return cutIndex === -1 ? url : url.slice(0, cutIndex);
  }
}
