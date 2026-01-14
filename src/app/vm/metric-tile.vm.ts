export type MetricSemantic = "neutral" | "profit" | "loss";

export interface MetricTileVm {
  id: string;
  label: string;
  value: string;
  hint?: string;
  semantic?: MetricSemantic;
  testId?: string;
}
