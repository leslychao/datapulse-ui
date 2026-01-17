import {UrlMatcher, UrlSegment} from "@angular/router";

import {APP_ROUTE_SEGMENTS} from "../app-paths";

const ACCOUNTLESS_SEGMENTS = new Set<string>([
  APP_ROUTE_SEGMENTS.dashboard,
  APP_ROUTE_SEGMENTS.home,
  APP_ROUTE_SEGMENTS.overview,
  APP_ROUTE_SEGMENTS.finance,
  APP_ROUTE_SEGMENTS.operations,
  APP_ROUTE_SEGMENTS.marketing,
  APP_ROUTE_SEGMENTS.dataHealth,
  APP_ROUTE_SEGMENTS.settings
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
