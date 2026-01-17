import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ToastService} from "./toast.service";
import {ModalComponent} from "../modal/modal.component";
import {ToastItem} from "./toast.model";

@Component({
  selector: "dp-toast-container",
  standalone: true,
  imports: [CommonModule, ModalComponent],
  template: `
    <div class="toast-container" *ngIf="toastService.toasts$ | async as toasts">
      <div
        class="toast"
        *ngFor="let toast of toasts"
        [class.success]="toast.variant === 'success'"
        [class.error]="toast.variant === 'error'"
        [class.info]="toast.variant === 'info'"
      >
        <span>{{ toast.message }}</span>
        <div class="toast-actions">
          <button
            type="button"
            class="toast-link"
            *ngIf="toast.details || toast.correlationId"
            (click)="openDetails(toast)"
          >
            Details
          </button>
          <button type="button" class="toast-close" (click)="toastService.dismiss(toast.id)">
            ×
          </button>
        </div>
      </div>
    </div>
    <dp-modal [visible]="detailsVisible" (close)="closeDetails()">
      <div class="toast-details">
        <h3>Details</h3>
        <p>{{ selectedToast?.message }}</p>
        <pre *ngIf="selectedToast?.details">{{ selectedToast?.details }}</pre>
        <p class="muted" *ngIf="selectedToast?.correlationId">
          Correlation ID: {{ selectedToast?.correlationId }}
        </p>
        <div class="toast-details-actions">
          <button type="button" class="toast-close" (click)="closeDetails()">Close</button>
        </div>
      </div>
    </dp-modal>
  `,
  styleUrl: "./toast-container.component.css"
})
export class ToastContainerComponent {
  detailsVisible = false;
  selectedToast: ToastItem | null = null;

  constructor(public readonly toastService: ToastService) {}

  openDetails(toast: ToastItem): void {
    this.selectedToast = toast;
    this.detailsVisible = true;
  }

  closeDetails(): void {
    this.detailsVisible = false;
    this.selectedToast = null;
  }
}
