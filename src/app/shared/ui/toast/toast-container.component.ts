import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ToastService} from "./toast.service";

@Component({
  selector: "dp-toast-container",
  standalone: true,
  imports: [CommonModule],
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
        <button type="button" (click)="toastService.dismiss(toast.id)">Закрыть</button>
      </div>
    </div>
  `,
  styleUrl: "./toast-container.component.css"
})
export class ToastContainerComponent {
  constructor(public readonly toastService: ToastService) {}
}
