import {Component, EventEmitter, Input, Output} from "@angular/core";
import {CommonModule} from "@angular/common";

@Component({
  selector: "dp-modal",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dp-modal-backdrop" *ngIf="visible" (click)="requestClose()">
      <div class="dp-modal" (click)="$event.stopPropagation()">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styleUrl: "./modal.component.css"
})
export class ModalComponent {
  @Input() visible = false;
  @Output() close = new EventEmitter<void>();

  requestClose(): void {
    this.close.emit();
  }
}
