import {Injectable} from "@angular/core";
import {BehaviorSubject} from "rxjs";
import {ToastItem, ToastVariant} from "./toast.model";

interface ToastOptions {
  details?: string;
  correlationId?: string;
}

@Injectable({providedIn: "root"})
export class ToastService {
  private readonly toastsSubject = new BehaviorSubject<ToastItem[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  success(message: string, options?: ToastOptions): void {
    this.show(message, "success", options);
  }

  error(message: string, options?: ToastOptions): void {
    this.show(message, "error", options);
  }

  info(message: string, options?: ToastOptions): void {
    this.show(message, "info", options);
  }

  dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toastsSubject.next(this.toastsSubject.value.filter((toast) => toast.id !== id));
  }

  private show(message: string, variant: ToastVariant, options?: ToastOptions): void {
    const existing = this.toastsSubject.value.find(
      (toast) => toast.message === message && toast.variant === variant
    );
    const nextToast: ToastItem = {
      id: existing?.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      message,
      variant,
      details: options?.details,
      correlationId: options?.correlationId
    };

    const nextList = existing
      ? [nextToast, ...this.toastsSubject.value.filter((toast) => toast.id !== existing.id)]
      : [nextToast, ...this.toastsSubject.value];

    this.toastsSubject.next(nextList);
    this.scheduleDismiss(nextToast);
  }

  private scheduleDismiss(toast: ToastItem): void {
    const durationMs = toast.variant === "error" ? 7000 : 3500;
    const existingTimer = this.timers.get(toast.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    const timer = setTimeout(() => {
      this.dismiss(toast.id);
    }, durationMs);
    this.timers.set(toast.id, timer);
  }
}
