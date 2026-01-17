import {Component, EventEmitter, Output} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {AccountMemberCreateRequest, AccountMemberRole, AccountMemberStatus} from "../../shared/models";
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
    userId: FormControl<string>;
    role: FormControl<AccountMemberRole>;
  }>;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.nonNullable.group({
      userId: ["", [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      role: [AccountMemberRole.Operator, Validators.required]
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const {role, userId} = this.form.getRawValue();
    const parsedUserId = Number(userId);
    if (!Number.isFinite(parsedUserId) || parsedUserId <= 0) {
      this.form.controls.userId.setErrors({invalid: true});
      return;
    }
    this.invite.emit({
      userId: parsedUserId,
      role,
      status: AccountMemberStatus.Active
    });
    this.form.reset({
      userId: "",
      role: AccountMemberRole.Operator
    });
  }
}
