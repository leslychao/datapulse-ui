import {Injectable, signal} from "@angular/core";

import {ApiError} from "../api";
import {AccountConnection} from "../../shared/models";

export type OnboardingStatusState = "idle" | "processing" | "success" | "error";

export interface OnboardingState {
  currentStep: number;
  accountId: number | null;
  accountName: string | null;
  connections: AccountConnection[];
  error: ApiError | null;
  tokenErrorMessage: string | null;
  statusState: OnboardingStatusState;
  statusText: string;
  statusHint: string | null;
  isStatusActive: boolean;
  isProcessing: boolean;
  formLocked: boolean;
}

const DEFAULT_STATUS_TEXT = "Онбординг · не завершён";

const INITIAL_STATE: OnboardingState = {
  currentStep: 0,
  accountId: null,
  accountName: null,
  connections: [],
  error: null,
  tokenErrorMessage: null,
  statusState: "idle",
  statusText: DEFAULT_STATUS_TEXT,
  statusHint: null,
  isStatusActive: false,
  isProcessing: false,
  formLocked: false
};

@Injectable({providedIn: "root"})
export class OnboardingStateService {
  readonly state = signal<OnboardingState>(INITIAL_STATE);

  patch(partial: Partial<OnboardingState>): void {
    this.state.update((state) => ({...state, ...partial}));
  }

  reset(): void {
    this.state.set(INITIAL_STATE);
  }

  resetStatus(): void {
    this.patch({
      statusState: "idle",
      statusText: DEFAULT_STATUS_TEXT,
      statusHint: null,
      isStatusActive: false,
      isProcessing: false,
      formLocked: false
    });
  }
}
