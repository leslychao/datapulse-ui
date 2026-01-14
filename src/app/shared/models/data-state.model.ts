export type DataState = "NOT_CONNECTED" | "NO_DATA" | "UNAVAILABLE" | "ERROR" | "READY";

export const DATA_STATE = {
  notConnected: "NOT_CONNECTED",
  noData: "NO_DATA",
  unavailable: "UNAVAILABLE",
  error: "ERROR",
  ready: "READY"
} as const;
