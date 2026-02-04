import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";
import {CommonModule} from "@angular/common";

import {ModalComponent} from "../modal/modal.component";
import {ButtonComponent} from "../button/button.component";

@Component({
  selector: "dp-confirm-dialog",
  standalone: true,
  imports: [CommonModule, ModalComponent, ButtonComponent],
  templateUrl: "./confirm-dialog.component.html",
  styleUrl: "./confirm-dialog.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() title = "";
  @Input() description = "";
  @Input() confirmLabel = "Confirm";
  @Input() cancelLabel = "Cancel";
  @Input() danger = false;
  @Input() loading = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  close(): void {
    if (this.loading) {
      return;
    }
    this.cancel.emit();
  }

  submit(): void {
    if (this.loading) {
      return;
    }
    this.confirm.emit();
  }
}
