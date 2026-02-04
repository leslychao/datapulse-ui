import {Component, Input} from "@angular/core";
import {CommonModule} from "@angular/common";

export type ButtonVariant = "primary" | "danger" | "secondary" | "link";
export type ButtonSize = "sm" | "md" | "lg";

@Component({
  selector: "dp-button",
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [attr.type]="type"
      [disabled]="disabled || loading"
      class="dp-button"
      [class.primary]="variant === 'primary'"
      [class.danger]="variant === 'danger'"
      [class.link]="variant === 'link'"
      [class.sm]="size === 'sm'"
      [class.lg]="size === 'lg'"
    >
      <span class="dp-button__spinner" *ngIf="loading" aria-hidden="true"></span>
      <span class="dp-button__icon"><ng-content select="[icon]"></ng-content></span>
      <span class="dp-button__label"><ng-content></ng-content></span>
    </button>
  `,
  styleUrl: "./button.component.css"
})
export class ButtonComponent {
  @Input() type: "button" | "submit" | "reset" = "button";
  @Input() variant: ButtonVariant = "secondary";
  @Input() size: ButtonSize = "md";
  @Input() disabled = false;
  @Input() loading = false;
}
