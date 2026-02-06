import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";

import {AccountMember, AccountMemberRole} from "../../shared/models";
import {ButtonComponent, FormFieldComponent, InputComponent, ModalComponent, SelectComponent} from "../../shared/ui";

export interface InviteMemberPayload {
  email: string;
  role: AccountMemberRole;
}

@Component({
  selector: "dp-invite-member-modal",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalComponent,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    FormFieldComponent
  ],
  templateUrl: "./invite-member-modal.component.html",
  styleUrl: "./invite-member-modal.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InviteMemberModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() saving = false;
  @Input() existingMembers: AccountMember[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() submitInvite = new EventEmitter<InviteMemberPayload>();

  readonly roleOptions = Object.values(AccountMemberRole);

  readonly form: FormGroup<{
    email: FormControl<string>;
    role: FormControl<AccountMemberRole>;
  }>;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.nonNullable.group({
      email: ["", [Validators.required, Validators.email]],
      role: [AccountMemberRole.Viewer, Validators.required]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["visible"] && this.visible) {
      this.form.reset({email: "", role: AccountMemberRole.Viewer});
      this.form.markAsPristine();
      this.form.markAsUntouched();
    }
    if (changes["saving"]) {
      if (this.saving) {
        this.form.disable({emitEvent: false});
      } else {
        this.form.enable({emitEvent: false});
      }
    }
  }

  requestClose(): void {
    if (this.saving) {
      return;
    }
    this.close.emit();
  }

  submit(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const {email, role} = this.form.getRawValue();
    const normalizedEmail = email.trim().toLowerCase();

    if (this.existingMembers.some((member) => (member.email ?? "").toLowerCase() === normalizedEmail)) {
      this.form.controls.email.setErrors({duplicate: true});
      return;
    }

    this.submitInvite.emit({email: email.trim(), role});
  }
}
