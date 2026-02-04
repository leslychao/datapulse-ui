import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ButtonComponent} from "../button/button.component";

@Component({
  selector: "dp-pagination",
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: "./pagination.component.html",
  styleUrl: "./pagination.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() totalPages = 1;

  @Output() pageChange = new EventEmitter<number>();

  get canGoPrev(): boolean {
    return this.page > 1;
  }

  get canGoNext(): boolean {
    return this.page < this.totalPages;
  }

  goPrev(): void {
    if (!this.canGoPrev) {
      return;
    }
    this.pageChange.emit(this.page - 1);
  }

  goNext(): void {
    if (!this.canGoNext) {
      return;
    }
    this.pageChange.emit(this.page + 1);
  }
}
