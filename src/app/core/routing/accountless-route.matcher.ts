import {UrlMatcher, UrlSegment} from "@angular/router";

import {APP_ROUTE_SEGMENTS} from "../app-paths";

const ACCOUNTLESS_SEGMENTS = new Set<string>([
  APP_ROUTE_SEGMENTS.overview,
  APP_ROUTE_SEGMENTS.finance,
  APP_ROUTE_SEGMENTS.operations,
  APP_ROUTE_SEGMENTS.marketing,
  APP_ROUTE_SEGMENTS.monitoring,
  APP_ROUTE_SEGMENTS.connections,
  APP_ROUTE_SEGMENTS.users,
  APP_ROUTE_SEGMENTS.workspaceSettings
]);

export const accountlessRouteMatcher: UrlMatcher = (segments: UrlSegment[]) => {
  if (!segments.length) {
    return null;
  }

  if (!ACCOUNTLESS_SEGMENTS.has(segments[0].path)) {
    return null;
  }

  return {consumed: segments};
};
