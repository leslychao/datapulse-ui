import {Observable, OperatorFunction, of} from "rxjs";
import {catchError, map, startWith} from "rxjs/operators";

export type LoadState<T, E = unknown> =
  | {status: "loading"}
  | {status: "ready"; data: T}
  | {status: "error"; error: E};

export const toLoadState = <T, E = unknown>(
  mapError?: (error: E) => E
): OperatorFunction<T, LoadState<T, E>> => {
  return (source: Observable<T>) =>
    source.pipe(
      map((data) => ({status: "ready", data} as const)),
      startWith({status: "loading"} as const),
      catchError((error: E) =>
        of({status: "error", error: mapError ? mapError(error) : error} as const)
      )
    );
};
