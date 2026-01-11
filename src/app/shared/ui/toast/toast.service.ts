import {Injectable} from "@angular/core";
import {BehaviorSubject} from "rxjs";
import {ToastItem, ToastVariant} from "./toast.model";

@Injectable({providedIn: "root"})
export class ToastService {
  private readonly toastsSubject = new BehaviorSubject<ToastItem[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();

  success(message: string): void {
    this.show(message, "success");
  }

  error(message: string): void {
    this.show(message, "error");
  }

  info(message: string): void {
    this.show(message, "info");
  }

  dismiss(id: string): void {
    this.toastsSubject.next(this.toastsSubject.value.filter((toast) => toast.id !== id));
  }

  private show(message: string, variant: ToastVariant): void {
    const toast: ToastItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      message,
      variant
    };
    this.toastsSubject.next([toast, ...this.toastsSubject.value]);
  }
}
