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

  backendMessages: readonly string[] | null = null;

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
    this.backendMessages = null;

    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
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
        error: (error: ApiError) => this.handleBackendError(error)
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

  private handleBackendError(error: ApiError): void {
    const messages = this.extractBackendMessages(error);
    this.backendMessages = messages.length ? messages : null;

    this.toastService.error("Не удалось создать workspace.", {
      details: this.formatToastDetails(messages, error),
      correlationId: error.correlationId
    });

    this.cdr.markForCheck();
  }

  private extractBackendMessages(error: ApiError): string[] {
    const anyError = error as unknown as {
      messages?: unknown;
      message?: unknown;
      details?: unknown;
    };

    const fromArray = Array.isArray(anyError.messages)
      ? anyError.messages.filter((m): m is string => typeof m === "string").map((m) => m.trim()).filter(Boolean)
      : [];

    if (fromArray.length) {
      return this.distinctKeepOrder(fromArray);
    }

    if (typeof anyError.details === "string") {
      const raw = anyError.details.trim();
      if (raw) {
        // Если бэк склеил ошибки через “; ” — всё равно покажем их списком (без выдумок, только разбор строки).
        const split = raw.split(";").map((s) => s.trim()).filter(Boolean);
        return this.distinctKeepOrder(split.length ? split : [raw]);
      }
    }

    if (typeof anyError.message === "string") {
      const raw = anyError.message.trim();
      if (raw) {
        return [raw];
      }
    }

    return [];
  }

  private formatToastDetails(messages: string[], error: ApiError): string | undefined {
    if (messages.length) {
      return messages.join("\n");
    }

    const anyError = error as unknown as {details?: unknown; message?: unknown};
    if (typeof anyError.details === "string" && anyError.details.trim()) {
      return anyError.details.trim();
    }
    if (typeof anyError.message === "string" && anyError.message.trim()) {
      return anyError.message.trim();
    }
    return undefined;
  }

  private distinctKeepOrder(values: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
      if (seen.has(value)) {
        continue;
      }
      seen.add(value);
      result.push(value);
    }
    return result;
  }
}
