import {HttpClient, HttpHeaders, HttpParams, HttpResponse} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {catchError, Observable, throwError} from "rxjs";
import {ApiError} from "./api-error.model";
import {toApiError} from "./api-error.util";
import {environment} from "../../../environments/environment";

type QueryParamPrimitive = string | number | boolean;
type QueryParamValue = QueryParamPrimitive | QueryParamPrimitive[] | null | undefined;
type QueryParams = Record<string, QueryParamValue>;

@Injectable({providedIn: "root"})
export class ApiClient {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  get<T>(url: string, params?: QueryParams | HttpParams): Observable<T> {
    const headers = new HttpHeaders({
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
    });
    return this.http
      .get<T>(this.buildUrl(url), {params: this.toParams(params), headers})
      .pipe(
      catchError((error) => this.handleError(error))
    );
  }

  post<T, B>(url: string, body: B): Observable<T> {
    return this.http.post<T>(this.buildUrl(url), body).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  postWithResponse<T, B>(url: string, body: B): Observable<HttpResponse<T>> {
    return this.http.post<T>(this.buildUrl(url), body, {observe: "response"}).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  put<T, B>(url: string, body: B): Observable<T> {
    return this.http.put<T>(this.buildUrl(url), body).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(this.buildUrl(url)).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  private handleError(error: unknown): Observable<never> {
    const apiError: ApiError = toApiError(error);
    return throwError(() => apiError);
  }

  private toParams(params?: QueryParams | HttpParams): HttpParams | undefined {
    if (!params) {
      return undefined;
    }
    if (params instanceof HttpParams) {
      return params;
    }
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item !== undefined && item !== null) {
            httpParams = httpParams.append(key, String(item));
          }
        });
        return;
      }
      httpParams = httpParams.set(key, String(value));
    });
    return httpParams;
  }

  private buildUrl(url: string): string {
    if (!this.baseUrl || /^https?:\/\//i.test(url)) {
      return url;
    }
    if (this.baseUrl.endsWith("/") && url.startsWith("/")) {
      return `${this.baseUrl.slice(0, -1)}${url}`;
    }
    if (!this.baseUrl.endsWith("/") && !url.startsWith("/")) {
      return `${this.baseUrl}/${url}`;
    }
    return `${this.baseUrl}${url}`;
  }
}
