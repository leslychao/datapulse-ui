import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {CommonModule} from "@angular/common";

@Component({
  selector: "dp-form-field",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./form-field.component.html",
  styleUrl: "./form-field.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormFieldComponent {
  @Input() label = "";
  @Input() hint = "";
  @Input() error = "";
  @Input() required = false;
}
