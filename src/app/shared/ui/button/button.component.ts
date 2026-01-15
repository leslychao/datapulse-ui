import {Component, Input} from "@angular/core";
import {CommonModule} from "@angular/common";

export type ButtonVariant = "primary" | "danger" | "secondary" | "link";

@Component({
  selector: "dp-button",
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [attr.type]="type"
      [disabled]="disabled"
      [class.primary]="variant === 'primary'"
      [class.danger]="variant === 'danger'"
      [class.link]="variant === 'link'"
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
}
