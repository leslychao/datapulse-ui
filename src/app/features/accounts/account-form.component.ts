import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {AccountCreateRequest} from "../../shared/models";
import {InputComponent} from "../../shared/ui";

type AccountFormGroup = FormGroup<{
  name: FormControl<string>;
}>;

@Component({
  selector: "dp-account-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent],
  templateUrl: "./account-form.component.html",
  styleUrl: "./account-form.component.css"
})
export class AccountFormComponent implements OnChanges {
  @Input() disabled = false;
  @Input() accountName: string | null = null;
  @Output() submitForm = new EventEmitter<AccountCreateRequest>();

  readonly form: AccountFormGroup;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.nonNullable.group({
      name: ["", Validators.required]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["disabled"]) {
      if (this.disabled) {
        this.form.disable();
      } else {
        this.form.enable();
      }
    }
    if (changes["accountName"] && this.accountName != null) {
      this.form.patchValue({name: this.accountName}, {emitEvent: false});
    }
  }

  getRequest(): AccountCreateRequest | null {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return null;
    }
    const {name} = this.form.getRawValue();
    return {name, active: true};
  }

  getCurrentName(): string {
    return this.form.getRawValue().name.trim();
  }

  isValid(): boolean {
    return this.form.valid;
  }

  submit(): void {
    const request = this.getRequest();
    if (!request) {
      return;
    }
    this.submitForm.emit(request);
  }
}
