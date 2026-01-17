import {Component, EventEmitter, Output} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {AccountMemberCreateRequest, AccountMemberRole} from "../../shared/models";
import {ButtonComponent, InputComponent} from "../../shared/ui";

@Component({
  selector: "dp-invite-operator-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent],
  templateUrl: "./invite-operator-form.component.html",
  styleUrl: "./invite-operator-form.component.css"
})
export class InviteOperatorFormComponent {
  @Output() invite = new EventEmitter<AccountMemberCreateRequest>();

  readonly roles = Object.values(AccountMemberRole);
  readonly form: FormGroup<{
    email: FormControl<string>;
    role: FormControl<AccountMemberRole>;
  }>;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.nonNullable.group({
      email: ["", [Validators.required, Validators.email]],
      role: [AccountMemberRole.Operator, Validators.required]
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const {role} = this.form.getRawValue();
    this.invite.emit({
      role
    });
    this.form.reset({
      email: "",
      role: AccountMemberRole.Operator
    });
  }
}
