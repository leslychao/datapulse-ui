import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import {
  AccountMember,
  AccountMemberAccessScope
} from "../../shared/models";
import {AccountConnection} from "../../shared/models";
import {ButtonComponent, ModalComponent} from "../../shared/ui";

export interface AccessModalSubmit {
  accessScope: AccountMemberAccessScope;
  connectionIds: number[];
}

@Component({
  selector: "dp-access-modal",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, ModalComponent],
  templateUrl: "./access-modal.component.html",
  styleUrl: "./access-modal.component.css"
})
export class AccessModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() member: AccountMember | null = null;
  @Input() connections: readonly AccountConnection[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<AccessModalSubmit>();

  readonly accessScopes = Object.values(AccountMemberAccessScope);

  readonly form: FormGroup<{
    accessScope: FormControl<AccountMemberAccessScope>;
    connectionIds: FormControl<number[]>;
  }>;

  constructor(private readonly fb: FormBuilder) {
    const emptyIds: number[] = [];
    this.form = this.fb.nonNullable.group({
      accessScope: [AccountMemberAccessScope.All],
      connectionIds: [emptyIds]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["member"] && this.member) {
      this.form.patchValue({
        accessScope: this.member.accessScope,
        connectionIds: this.member.connectionIds
      });
    }
  }

  toggleConnection(connectionId: number, checked: boolean): void {
    const current = new Set(this.form.controls.connectionIds.value);
    if (checked) {
      current.add(connectionId);
    } else {
      current.delete(connectionId);
    }
    this.form.controls.connectionIds.setValue(Array.from(current));
  }

  submit(): void {
    const {accessScope, connectionIds} = this.form.getRawValue();
    this.save.emit({accessScope, connectionIds});
  }
}
