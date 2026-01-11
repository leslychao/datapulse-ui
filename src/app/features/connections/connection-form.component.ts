import {Component, EventEmitter, Input, Output} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {
  AccountConnectionCreateRequest,
  Marketplace,
  OzonCredentials,
  WildberriesCredentials
} from "../../shared/models";
import {ButtonComponent, InputComponent} from "../../shared/ui";

@Component({
  selector: "dp-connection-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent],
  templateUrl: "./connection-form.component.html",
  styleUrl: "./connection-form.component.css"
})
export class ConnectionFormComponent {
  @Input({required: true}) accountId!: number;
  @Output() submitForm = new EventEmitter<AccountConnectionCreateRequest>();

  readonly marketplaces = Object.values(Marketplace);
  readonly marketplaceWildberries = Marketplace.Wildberries;
  readonly marketplaceOzon = Marketplace.Ozon;

  readonly form: FormGroup<{
    marketplace: FormControl<Marketplace>;
    name: FormControl<string>;
    token: FormControl<string>;
    clientId: FormControl<string>;
    apiKey: FormControl<string>;
  }>;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.nonNullable.group({
      marketplace: [Marketplace.Wildberries, Validators.required],
      name: ["", Validators.required],
      token: [""],
      clientId: [""],
      apiKey: [""]
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const {marketplace, name, token, clientId, apiKey} = this.form.getRawValue();
    const credentials = this.buildCredentials(marketplace, token, clientId, apiKey);

    if (!credentials) {
      return;
    }

    this.submitForm.emit({
      accountId: this.accountId,
      name,
      marketplace,
      credentials
    });
  }

  private buildCredentials(
    marketplace: Marketplace,
    token: string,
    clientId: string,
    apiKey: string
  ): WildberriesCredentials | OzonCredentials | null {
    if (marketplace === Marketplace.Wildberries) {
      if (!token) {
        return null;
      }
      return {token};
    }
    if (!clientId || !apiKey) {
      return null;
    }
    return {clientId, apiKey};
  }
}
