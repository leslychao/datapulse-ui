import {HttpErrorResponse} from "@angular/common/http";
import {ApiError} from "./api-error.model";

export const DEFAULT_API_ERROR: ApiError = {
  status: 0,
  message: "Неожиданная ошибка. Попробуйте еще раз."
};

export const toApiError = (error: unknown): ApiError => {
  if (error instanceof HttpErrorResponse) {
    const message =
      typeof error.error?.message === "string"
        ? error.error.message
        : error.statusText || DEFAULT_API_ERROR.message;
    const details = typeof error.error?.details === "string" ? error.error.details : undefined;
    const correlationId =
      error.headers?.get("x-correlation-id") ??
      error.headers?.get("X-Correlation-Id") ??
      (typeof error.error?.correlationId === "string" ? error.error.correlationId : undefined);
    return {
      status: error.status,
      message,
      details,
      correlationId
    };
  }
  if (error instanceof Error) {
    return {
      status: DEFAULT_API_ERROR.status,
      message: error.message
    };
  }
  return DEFAULT_API_ERROR;
};
