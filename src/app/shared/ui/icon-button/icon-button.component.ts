import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {CommonModule} from "@angular/common";

import type {ButtonSize, ButtonVariant} from "../button/button.component";

export type IconName = "user-plus";

@Component({
  selector: "dp-icon-button",
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="dp-icon-button"
      [attr.type]="type"
      [disabled]="disabled"
      [attr.aria-label]="ariaLabel"
      [attr.title]="title"
      [class.primary]="variant === 'primary'"
      [class.danger]="variant === 'danger'"
      [class.link]="variant === 'link'"
      [class.sm]="size === 'sm'"
      [class.lg]="size === 'lg'"
    >
      <span class="dp-icon-button__icon" aria-hidden="true">
        <ng-container [ngSwitch]="icon">
          <svg
            *ngSwitchCase="'user-plus'"
            class="dp-icon-button__svg"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M3 21a7 7 0 0 1 14 0"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M19 8v6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              d="M16 11h6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </ng-container>
      </span>
    </button>
  `,
  styleUrl: "./icon-button.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconButtonComponent {
  @Input() icon: IconName = "user-plus";
  @Input() ariaLabel = "";
  @Input() title = "";
  @Input() type: "button" | "submit" | "reset" = "button";
  @Input() variant: ButtonVariant = "secondary";
  @Input() size: ButtonSize = "md";
  @Input() disabled = false;
}
