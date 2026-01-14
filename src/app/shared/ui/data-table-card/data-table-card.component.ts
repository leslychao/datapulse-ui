import {Component, Input} from "@angular/core";
import {CommonModule} from "@angular/common";

import {DataState} from "../../../shared/models";
import {TableColumnVm} from "../../../vm/table-column.vm";
import {DataStateGateComponent} from "../data-state-gate/data-state-gate.component";

export type DataTableRow = Record<string, string | number | null>;

@Component({
  selector: "dp-data-table-card",
  standalone: true,
  imports: [CommonModule, DataStateGateComponent],
  templateUrl: "./data-table-card.component.html",
  styleUrl: "./data-table-card.component.css"
})
export class DataTableCardComponent {
  @Input() title = "";
  @Input() subtitle = "";
  @Input() columns: TableColumnVm[] = [];
  @Input() rows: DataTableRow[] = [];
  @Input() state: DataState = "UNAVAILABLE";
  @Input() accountId: number | null = null;
  @Input() compact = false;
  @Input() testId = "data-table";

  sortKey: string | null = null;
  sortDirection: "asc" | "desc" = "asc";

  get sortedRows(): DataTableRow[] {
    if (!this.sortKey) {
      return this.rows;
    }
    const key = this.sortKey;
    const direction = this.sortDirection === "asc" ? 1 : -1;
    return [...this.rows].sort((a, b) => {
      const valueA = a[key];
      const valueB = b[key];
      if (valueA == null && valueB == null) {
        return 0;
      }
      if (valueA == null) {
        return 1 * direction;
      }
      if (valueB == null) {
        return -1 * direction;
      }
      if (typeof valueA === "number" && typeof valueB === "number") {
        return (valueA - valueB) * direction;
      }
      return String(valueA).localeCompare(String(valueB)) * direction;
    });
  }

  setSort(column: TableColumnVm): void {
    if (!column.sortable) {
      return;
    }
    if (this.sortKey === column.key) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortKey = column.key;
      this.sortDirection = "asc";
    }
  }

  getHeaderClass(column: TableColumnVm): Record<string, boolean> {
    return {
      "is-sortable": !!column.sortable,
      "is-active": this.sortKey === column.key,
      "align-right": column.align === "right",
      "align-center": column.align === "center"
    };
  }

  getCellClass(column: TableColumnVm, value: string | number | null): Record<string, boolean> {
    return {
      "align-right": column.align === "right",
      "align-center": column.align === "center",
      "is-profit": column.semantic === "profitLoss" && typeof value === "number" && value >= 0,
      "is-loss": column.semantic === "profitLoss" && typeof value === "number" && value < 0
    };
  }
}
