import {Component, EventEmitter, Output} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {AccountCreateRequest} from "../../models/account.model";

type AccountFormGroup = FormGroup<{
  name: FormControl<string>;
  timezone: FormControl<string>;
  currency: FormControl<string>;
}>;

@Component({
  selector: "dp-account-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./account-form.component.html",
  styleUrl: "./account-form.component.css"
})
export class AccountFormComponent {
  @Output() submitForm = new EventEmitter<AccountCreateRequest>();

  readonly form: AccountFormGroup;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.nonNullable.group({
      name: ["", Validators.required],
      timezone: ["Europe/Moscow", Validators.required],
      currency: ["RUB", Validators.required]
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitForm.emit(this.form.getRawValue());
  }
}
