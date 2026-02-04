import {Component, forwardRef, Input} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from "@angular/forms";

@Component({
  selector: "dp-select",
  standalone: true,
  imports: [CommonModule],
  template: `
    <select [disabled]="disabled" [value]="value" (change)="onChange($event)">
      <ng-content></ng-content>
    </select>
  `,
  styleUrl: "./select.component.css",
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ]
})
export class SelectComponent implements ControlValueAccessor {
  @Input() value = "";
  @Input() disabled = false;

  private onValueChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value = value ?? "";
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onValueChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.value = target.value;
    this.onValueChange(this.value);
    this.onTouched();
  }
}
