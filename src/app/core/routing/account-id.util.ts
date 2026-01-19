import {ActivatedRoute} from "@angular/router";
import {combineLatest, Observable, of} from "rxjs";
import {distinctUntilChanged, map} from "rxjs/operators";

export const accountIdFromRoute = (route: ActivatedRoute): Observable<number | null> => {
  const paramStreams = route.pathFromRoot.map((segment) => segment.paramMap);
  if (paramStreams.length === 0) {
    return of(null);
  }

  return combineLatest(paramStreams).pipe(
    map((maps) => maps.map((mapItem) => mapItem.get("accountId")).find((id) => id != null) ?? null),
    map((value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }),
    distinctUntilChanged()
  );
};
