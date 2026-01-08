import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";
import { finalize } from "rxjs/operators";

import { InventoryFactApi } from "./inventory/inventory-fact.api";
import { InventoryFact } from "./inventory/inventory-fact.model";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: "./app.component.html"
})
export class AppComponent implements OnInit {

  rows: readonly InventoryFact[] = [];
  loading = false;
  error: string | null = null;

  // фильтры
  accountId = 1;
  marketplace = "OZON";
  fromDate: string | null = null;
  toDate: string | null = null;
  warehouseId: number | null = null;
  sourceProductId: string | null = null;
  limit = 200;

  constructor(private readonly api: InventoryFactApi) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.error = null;
    this.loading = true;

    const query = {
      accountId: this.accountId,
      marketplace: this.marketplace || undefined,
      fromDate: this.fromDate || undefined,
      toDate: this.toDate || undefined,
      warehouseId: this.warehouseId ?? undefined,
      sourceProductId: this.sourceProductId || undefined,
      size: this.limit,
      page: 0
    };

    this.api.list(query)
    .pipe(finalize(() => (this.loading = false)))
    .subscribe({
      next: (data: InventoryFact[]) => (this.rows = data),
      error: (err) => {
        console.error(err);
        this.rows = [];
        this.error = "Failed to load inventory facts from /api/inventory-snapshots.";
      }
    });
  }
}
