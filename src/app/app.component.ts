import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";
import { finalize } from "rxjs/operators";

import { SalesFactsApi } from "./core/sales-facts.api";
import { SalesFact } from "./core/sales-facts.model";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: "./app.component.html"
})
export class AppComponent implements OnInit {

  rows: readonly SalesFact[] = [];
  loading = false;
  error: string | null = null;

  // NEW: принудительный мок
  mockMode = true;

  accountId = 1;
  sourcePlatform = "";
  dateFrom: string | null = null;
  dateTo: string | null = null;
  limit = 200;

  constructor(private readonly api: SalesFactsApi) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.error = null;
    this.loading = true;

    const params = {
      accountId: this.accountId,
      sourcePlatform: this.sourcePlatform || undefined,
      dateFrom: this.dateFrom || undefined,
      dateTo: this.dateTo || undefined,
      limit: this.limit
    };

    const source$ = this.mockMode
      ? this.api.listMock()
      : this.api.listWithFallback(params);

    source$
    .pipe(finalize(() => (this.loading = false)))
    .subscribe({
      next: (data) => (this.rows = data),
      error: () => {
        this.rows = [];
        this.error = "Failed to load sales facts (api + mock).";
      }
    });
  }
}
