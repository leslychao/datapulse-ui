import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {CommonModule} from "@angular/common";
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from "@angular/forms";

import {AccountMember, AccountMemberRole} from "../../shared/models";
import {ButtonComponent, FormFieldComponent, InputComponent, ModalComponent, SelectComponent} from "../../shared/ui";

export interface InviteMemberRowPayload {
  identifier: string;
  role: AccountMemberRole;
}

export interface InviteMembersPayload {
  invites: InviteMemberRowPayload[];
}

export type InviteRowResultStatus = "sent" | "failed";

export interface InviteRowResult {
  identifier: string;
  status: InviteRowResultStatus;
  message?: string;
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

  /**
   * Результаты последней batch-отправки. Если есть неуспешные строки — отображаем их рядом с соответствующими полями.
   */
  @Input() results: InviteRowResult[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() submitInvites = new EventEmitter<InviteMembersPayload>();

  /**
   * ВАЖНО: никаких Object.values(enum), чтобы не тащить "лишние" значения и "Роль".
   */
  readonly roleOptions: ReadonlyArray<AccountMemberRole> = [
    AccountMemberRole.Admin,
    AccountMemberRole.Operator,
    AccountMemberRole.Viewer
  ];

  readonly form: FormGroup<{
    invites: FormArray<FormGroup<{identifier: FormControl<string>; role: FormControl<AccountMemberRole>}>>;
  }>;

  private submitted = false;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.nonNullable.group({
      invites: this.fb.nonNullable.array([
        this.createInviteRowGroup({identifier: "", role: AccountMemberRole.Viewer})
      ])
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["visible"] && this.visible) {
      this.resetForm();
    }
    if (changes["saving"]) {
      if (this.saving) {
        this.form.disable({emitEvent: false});
      } else {
        this.form.enable({emitEvent: false});
      }
    }
  }

  get invites(): FormArray<FormGroup<{identifier: FormControl<string>; role: FormControl<AccountMemberRole>}>> {
    return this.form.controls.invites;
  }

  addRow(): void {
    if (this.saving) {
      return;
    }
    this.invites.push(this.createInviteRowGroup({identifier: "", role: AccountMemberRole.Viewer}));
    this.form.markAsDirty();
  }

  removeRow(index: number): void {
    if (this.saving) {
      return;
    }
    if (this.invites.length <= 1) {
      return;
    }
    this.invites.removeAt(index);
    this.form.markAsDirty();
  }

  requestClose(): void {
    if (this.saving) {
      return;
    }
    this.close.emit();
  }

  submit(): void {
    if (this.saving) {
      return;
    }

    this.submitted = true;

    this.applyCrossRowValidation();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const invites = this.invites.getRawValue().map((row) => ({
      identifier: row.identifier.trim(),
      role: row.role
    }));

    this.submitInvites.emit({invites});
  }

  rowErrorMessage(index: number): string | null {
    const control = this.invites.at(index).controls.identifier;
    const errors = control.errors;
    if (!errors) {
      return this.serverErrorMessage(control.value);
    }

    if (errors["required"]) {
      return "Укажите e-mail или ID профиля.";
    }
    if (errors["invalidIdentifier"]) {
      return "Некорректный e-mail или ID профиля.";
    }
    if (errors["duplicateInBatch"]) {
      return "Дубликат в списке приглашений.";
    }
    if (errors["alreadyMember"]) {
      return "Пользователь уже добавлен в workspace.";
    }

    return this.serverErrorMessage(control.value);
  }

  isRowErrorVisible(index: number): boolean {
    const control = this.invites.at(index).controls.identifier;
    return this.submitted || control.touched;
  }

  roleLabel(role: AccountMemberRole): string {
    if (role === AccountMemberRole.Admin) {
      return "Администратор";
    }
    if (role === AccountMemberRole.Operator) {
      return "Оператор";
    }
    if (role === AccountMemberRole.Viewer) {
      return "Наблюдатель";
    }
    /**
     * ВАЖНО: никаких "Роль". Если внезапно прилетело неизвестное значение — показываем нейтрально.
     */
    return "—";
  }

  roleDescription(role: AccountMemberRole | null | undefined): string {
    if (role === AccountMemberRole.Admin) {
      return "Полный доступ, включая управление пользователями.";
    }
    if (role === AccountMemberRole.Operator) {
      return "Работа с подключениями и синхронизациями данных.";
    }
    if (role === AccountMemberRole.Viewer) {
      return "Только просмотр без изменений.";
    }
    return "";
  }

  private serverErrorMessage(rawIdentifier: string): string | null {
    const normalized = this.normalizeIdentifier(rawIdentifier);
    const result = this.results.find((r) => this.normalizeIdentifier(r.identifier) === normalized);
    if (!result || result.status !== "failed") {
      return null;
    }
    return result.message ?? "Не удалось отправить приглашение.";
  }

  private resetForm(): void {
    this.invites.clear();
    this.invites.push(this.createInviteRowGroup({identifier: "", role: AccountMemberRole.Viewer}));
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.submitted = false;
  }

  private createInviteRowGroup(initial: {identifier: string; role: AccountMemberRole}): FormGroup<{
    identifier: FormControl<string>;
    role: FormControl<AccountMemberRole>;
  }> {
    return this.fb.nonNullable.group({
      identifier: [initial.identifier, [Validators.required, this.identifierValidator.bind(this)]],
      role: [initial.role, Validators.required]
    });
  }

  private identifierValidator(control: AbstractControl<string>): ValidationErrors | null {
    const rawValue = control.value;
    const normalized = rawValue.trim();
    if (!normalized) {
      return null;
    }

    const isEmail = this.isValidEmail(normalized);
    const isProfileId = this.isValidProfileId(normalized);
    if (!isEmail && !isProfileId) {
      return {invalidIdentifier: true};
    }

    // Проверяем "уже участник" только когда можем сопоставить уверенно.
    if (isEmail) {
      const normalizedEmail = normalized.toLowerCase();
      if (this.existingMembers.some((m) => (m.email ?? "").toLowerCase() === normalizedEmail)) {
        return {alreadyMember: true};
      }
    }
    if (isProfileId) {
      const profileId = Number(normalized);
      if (Number.isFinite(profileId) && this.existingMembers.some((m) => m.userId === profileId)) {
        return {alreadyMember: true};
      }
    }

    return null;
  }

  private applyCrossRowValidation(): void {
    const normalizedToIndex = new Map<string, number>();
    this.invites.controls.forEach((rowGroup, index) => {
      const control = rowGroup.controls.identifier;
      const normalized = this.normalizeIdentifier(control.value);
      if (!normalized) {
        this.clearError(control, "duplicateInBatch");
        return;
      }

      const existingIndex = normalizedToIndex.get(normalized);
      if (existingIndex == null) {
        normalizedToIndex.set(normalized, index);
        this.clearError(control, "duplicateInBatch");
        return;
      }

      this.addError(control, {duplicateInBatch: true});
      const firstControl = this.invites.at(existingIndex).controls.identifier;
      this.addError(firstControl, {duplicateInBatch: true});
    });
  }

  private normalizeIdentifier(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    return this.isValidEmail(trimmed) ? trimmed.toLowerCase() : trimmed;
  }

  private isValidEmail(value: string): boolean {
    // Простая, но достаточная для UI-предвалидации.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private isValidProfileId(value: string): boolean {
    return /^[0-9]+$/.test(value);
  }

  private addError(control: FormControl<string>, error: ValidationErrors): void {
    const current = control.errors ?? {};
    control.setErrors({...current, ...error});
  }

  private clearError(control: FormControl<string>, errorKey: string): void {
    const current = control.errors;
    if (!current || !current[errorKey]) {
      return;
    }
    const {[errorKey]: _, ...rest} = current;
    control.setErrors(Object.keys(rest).length ? rest : null);
  }
}
