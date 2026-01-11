import {Component, forwardRef, Input} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from "@angular/forms";

@Component({
  selector: "dp-input",
  standalone: true,
  imports: [CommonModule],
  template: `
    <input
      [attr.type]="type"
      [attr.placeholder]="placeholder"
      [attr.autocomplete]="autocomplete"
      [disabled]="disabled"
      [value]="value"
      (input)="onInput($event)"
      (blur)="handleBlur()"
    />
  `,
  styleUrl: "./input.component.css",
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ]
})
export class InputComponent implements ControlValueAccessor {
  @Input() type = "text";
  @Input() placeholder = "";
  @Input() autocomplete: string | null = null;

  value = "";
  disabled = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value = value ?? "";
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  handleBlur(): void {
    this.onTouched();
  }
}
