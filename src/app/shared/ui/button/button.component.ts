import {Component, Input} from "@angular/core";
import {CommonModule} from "@angular/common";

export type ButtonVariant = "primary" | "danger" | "secondary";

@Component({
  selector: "dp-button",
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [attr.type]="type"
      [disabled]="disabled"
      [ngClass]="variantClass"
    >
      <ng-content></ng-content>
    </button>
  `,
  styleUrl: "./button.component.css"
})
export class ButtonComponent {
  @Input() type: "button" | "submit" | "reset" = "button";
  @Input() variant: ButtonVariant = "secondary";
  @Input() disabled = false;

  get variantClass(): Record<string, boolean> {
    return {
      primary: this.variant === "primary",
      danger: this.variant === "danger"
    };
  }
}
