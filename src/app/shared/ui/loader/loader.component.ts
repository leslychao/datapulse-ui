import {Component, Input} from "@angular/core";
import {CommonModule} from "@angular/common";

@Component({
  selector: "dp-loader",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dp-loader" [class.inline]="inline">
      <span class="spinner"></span>
      <span class="label" *ngIf="label">{{ label }}</span>
    </div>
  `,
  styleUrl: "./loader.component.css"
})
export class LoaderComponent {
  @Input() label = "";
  @Input() inline = false;
}
