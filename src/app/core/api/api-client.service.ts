import {HttpClient, HttpParams} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {catchError, Observable, throwError} from "rxjs";
import {ApiError} from "./api-error.model";
import {toApiError} from "./api-error.util";

type QueryParams = Record<string, string | number | boolean | undefined>;

@Injectable({providedIn: "root"})
export class ApiClient {
  constructor(private readonly http: HttpClient) {}

  get<T>(url: string, params?: QueryParams): Observable<T> {
    return this.http.get<T>(url, {params: this.toParams(params)}).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  post<T, B>(url: string, body: B): Observable<T> {
    return this.http.post<T>(url, body).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  put<T, B>(url: string, body: B): Observable<T> {
    return this.http.put<T>(url, body).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(url).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  private handleError(error: unknown): Observable<never> {
    const apiError: ApiError = toApiError(error);
    return throwError(() => apiError);
  }

  private toParams(params?: QueryParams): HttpParams | undefined {
    if (!params) {
      return undefined;
    }
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return httpParams;
  }
}
