import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {
  AccountConnectionCreateRequest,
  Marketplace,
  OzonCredentials,
  WildberriesCredentials
} from "../../shared/models";
import {InputComponent} from "../../shared/ui";

@Component({
  selector: "dp-connection-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent],
  templateUrl: "./connection-form.component.html",
  styleUrl: "./connection-form.component.css"
})
export class ConnectionFormComponent implements OnChanges {
  @Input({required: true}) accountId!: number;
  @Input() connectionName = "";
  @Input() disabled = false;
  @Input() errorMessage: string | null = null;
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["connectionName"]) {
      this.form.patchValue({name: this.connectionName});
    }
    if (changes["disabled"]) {
      if (this.disabled) {
        this.form.disable();
      } else {
        this.form.enable();
      }
    }
  }

  submit(): void {
    const request = this.getRequest(this.accountId);
    if (!request) {
      return;
    }
    this.submitForm.emit(request);
  }

  getRequest(accountId: number): AccountConnectionCreateRequest | null {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return null;
    }

    const {marketplace, name, token, clientId, apiKey} = this.form.getRawValue();
    const credentials = this.buildCredentials(marketplace, token, clientId, apiKey);

    if (!credentials) {
      this.form.markAllAsTouched();
      return null;
    }

    return {
      accountId,
      name,
      marketplace,
      credentials
    };
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
