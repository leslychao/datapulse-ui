export type TableColumnAlign = "left" | "right" | "center";

export interface TableColumnVm {
  key: string;
  label: string;
  sortable?: boolean;
  align?: TableColumnAlign;
  semantic?: "profitLoss";
}
