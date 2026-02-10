import {CommonModule} from "@angular/common";
import {Component, EventEmitter, forwardRef, Input, Output} from "@angular/core";
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from "@angular/forms";

@Component({
  selector: "dp-input",
  standalone: true,
  imports: [CommonModule],
  template: `
    <input
      [attr.id]="id"
      [attr.name]="name"
      [attr.type]="type"
      [attr.placeholder]="placeholder"
      [attr.autocomplete]="autocomplete"
      [disabled]="disabled"
      [value]="value"
      (input)="onInput($event)"
      (focus)="handleFocus($event)"
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

  // ВАЖНО: для анти-autofill и для нормальной интеграции с формами
  @Input() name: string | null = null;
  @Input() id: string | null = null;

  // Позволяем родителю повесить (focus)="..."
  @Output() focus = new EventEmitter<FocusEvent>();

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

  handleFocus(event: FocusEvent): void {
    this.focus.emit(event);
  }

  handleBlur(): void {
    this.onTouched();
  }
}
