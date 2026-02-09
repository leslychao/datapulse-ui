import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {Router} from "@angular/router";
import {EMPTY, Observable, of, timer} from "rxjs";
import {catchError, filter, finalize, map, switchMap, take, tap, timeout} from "rxjs/operators";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AccountsApiClient, ApiError, IamApiClient} from "../../core/api";
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
  private readonly iamApi = inject(IamApiClient);
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

  private waitUntilWorkspaceAccessible(accountId: number): Observable<void> {
    const attempts = 20;
    const intervalMs = 250;

    return timer(0, intervalMs).pipe(
      take(attempts),
      switchMap(() =>
        this.iamApi.getAccessibleAccounts().pipe(
          map((accounts) => accounts.some((account) => account.id === accountId)),
          catchError(() => of(false))
        )
      ),
      filter((isAccessible) => isAccessible),
      take(1),
      map(() => void 0),
      timeout({first: attempts * intervalMs})
    );
  }

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
        switchMap((account) =>
          this.waitUntilWorkspaceAccessible(account.id).pipe(
            map(() => account),
            catchError(() => {
              this.toastService.error("Workspace создан, но ещё не доступен.", {
                details:
                  "Новый workspace может появиться в доступных рабочих пространствах с небольшой задержкой. Откройте список и попробуйте снова."
              });
              this.router.navigateByUrl(APP_PATHS.workspaces);
              return EMPTY;
            })
          )
        ),
        tap((account) => {
          this.accountContext.setAccountId(account.id);
          this.toastService.success("Workspace создан и выбран текущим.");
          this.router.navigateByUrl(APP_PATHS.workspaces);
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
