export type FilterFieldType = "select" | "date" | "search" | "text";

export interface FilterFieldOption {
  label: string;
  value: string;
}

export interface FilterFieldVm {
  id: string;
  label: string;
  type: FilterFieldType;
  placeholder?: string;
  options?: FilterFieldOption[];
}
