import {Component, EventEmitter, Input, Output} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {
  AccountMemberAccessScope,
  AccountMemberCreateRequest,
  AccountMemberRole
} from "../../shared/models";
import {ButtonComponent, InputComponent} from "../../shared/ui";

@Component({
  selector: "dp-invite-operator-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent],
  templateUrl: "./invite-operator-form.component.html",
  styleUrl: "./invite-operator-form.component.css"
})
export class InviteOperatorFormComponent {
  @Input({required: true}) accountId!: number;
  @Output() invite = new EventEmitter<AccountMemberCreateRequest>();

  readonly roles = Object.values(AccountMemberRole);
  readonly scopes = Object.values(AccountMemberAccessScope);

  readonly form: FormGroup<{
    email: FormControl<string>;
    role: FormControl<AccountMemberRole>;
    accessScope: FormControl<AccountMemberAccessScope>;
  }>;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.nonNullable.group({
      email: ["", [Validators.required, Validators.email]],
      role: [AccountMemberRole.Operator, Validators.required],
      accessScope: [AccountMemberAccessScope.All, Validators.required]
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const {email, role, accessScope} = this.form.getRawValue();
    this.invite.emit({
      accountId: this.accountId,
      email,
      role,
      accessScope,
      connectionIds: []
    });
    this.form.reset({
      email: "",
      role: AccountMemberRole.Operator,
      accessScope: AccountMemberAccessScope.All
    });
  }
}
