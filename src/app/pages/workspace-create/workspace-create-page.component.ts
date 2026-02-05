import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {Router} from "@angular/router";
import {finalize, tap} from "rxjs/operators";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AccountsApiClient, ApiError} from "../../core/api";
import {AccountContextService} from "../../core/state";
import {APP_PATHS} from "../../core/app-paths";
import {
  ButtonComponent,
  FormFieldComponent,
  InputComponent,
  PageHeaderComponent,
  PageLayoutComponent,
  ToastService
} from "../../shared/ui";

@Component({
  selector: "dp-workspace-create-page",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageLayoutComponent,
    PageHeaderComponent,
    FormFieldComponent,
    InputComponent,
    ButtonComponent
  ],
  templateUrl: "./workspace-create-page.component.html",
  styleUrl: "./workspace-create-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspaceCreatePageComponent {
  private readonly accountsApi = inject(AccountsApiClient);
  private readonly accountContext = inject(AccountContextService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  saving = false;

  readonly form: FormGroup<{
    name: FormControl<string>;
  }> = this.fb.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(32)]]
  });

  submit(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    const {name} = this.form.getRawValue();
    this.saving = true;
    this.accountsApi
      .create({name: name.trim(), active: true})
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((account) => {
          this.accountContext.setAccountId(account.id);
          this.toastService.success("Workspace создан.");
          this.router.navigateByUrl(APP_PATHS.workspaceSettings(account.id));
        }),
        tap({
          error: (error: ApiError) => {
            this.toastService.error("Не удалось создать workspace.", {
              details: error.details,
              correlationId: error.correlationId
            });
          }
        }),
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe();
  }

  goToWorkspaces(): void {
    this.router.navigateByUrl(APP_PATHS.workspaces);
  }
}
