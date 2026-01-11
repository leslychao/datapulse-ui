import {HttpErrorResponse} from "@angular/common/http";
import {ApiError} from "./api-error.model";

export const DEFAULT_API_ERROR: ApiError = {
  status: 0,
  message: "Unexpected error. Please try again."
};

export const toApiError = (error: unknown): ApiError => {
  if (error instanceof HttpErrorResponse) {
    const message =
      typeof error.error?.message === "string"
        ? error.error.message
        : error.statusText || DEFAULT_API_ERROR.message;
    const details = typeof error.error?.details === "string" ? error.error.details : undefined;
    return {
      status: error.status,
      message,
      details
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
