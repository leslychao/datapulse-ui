export type EtlScenarioDateMode = "LAST_DAYS";

export interface EtlScenarioEvent {
  event: string;
  dateMode: EtlScenarioDateMode;
  lastDays: number;
}

export interface EtlScenarioRequest {
  accountId: number;
  events: EtlScenarioEvent[];
}
