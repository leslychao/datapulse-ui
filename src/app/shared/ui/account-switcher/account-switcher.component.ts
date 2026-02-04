import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from "@angular/core";
import {CommonModule} from "@angular/common";
import {OverlayModule, ConnectedPosition} from "@angular/cdk/overlay";

import {AccountResponse, UserProfileResponse} from "../../models";

type WorkspacesStatus = "loading" | "ready" | "error";

@Component({
  selector: "dp-account-switcher",
  standalone: true,
  imports: [CommonModule, OverlayModule],
  templateUrl: "./account-switcher.component.html",
  styleUrl: "./account-switcher.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountSwitcherComponent {
  @Input({required: true}) profile: UserProfileResponse | null = null;
  @Input() workspaces: AccountResponse[] = [];
  @Input() activeWorkspaceId: number | null = null;
  @Input() workspacesStatus: WorkspacesStatus = "loading";

  @Output() selectWorkspace = new EventEmitter<number>();
  @Output() manageWorkspace = new EventEmitter<number>();
  @Output() openWorkspaces = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<void>();
  @Output() createWorkspace = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  isOpen = false;
  search = "";

  readonly overlayPositions: ConnectedPosition[] = [
    {
      originX: "end",
      originY: "bottom",
      overlayX: "end",
      overlayY: "top",
      offsetY: 8
    },
    {
      originX: "end",
      originY: "top",
      overlayX: "end",
      overlayY: "bottom",
      offsetY: -8
    }
  ];

  get activeWorkspace(): AccountResponse | null {
    const active = this.workspaces.find((workspace) => workspace.id === this.activeWorkspaceId);
    return active ?? null;
  }

  get displayWorkspaceName(): string {
    if (this.activeWorkspace) {
      return this.activeWorkspace.name;
    }
    if (this.workspacesStatus === "loading") {
      return "Loading workspace…";
    }
    if (this.workspaces.length === 0) {
      return "No workspace yet";
    }
    return "Select workspace";
  }

  get displayUserName(): string {
    if (!this.profile) {
      return "Guest";
    }
    return (
      this.profile.fullName ||
      this.profile.username ||
      this.profile.email ||
      this.profile.keycloakSub ||
      "User"
    );
  }

  get userInitials(): string {
    const name = this.displayUserName.trim();
    if (!name) {
      return "U";
    }
    const words = name.split(" ").filter(Boolean);
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  get filteredWorkspaces(): AccountResponse[] {
    const query = this.search.trim().toLowerCase();
    if (!query) {
      return this.workspaces;
    }
    return this.workspaces.filter((workspace) =>
      workspace.name.toLowerCase().includes(query)
    );
  }

  toggleMenu(): void {
    this.isOpen = !this.isOpen;
  }

  closeMenu(): void {
    this.isOpen = false;
  }

  handleBackdropClick(): void {
    this.closeMenu();
  }

  onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.stopPropagation();
      this.closeMenu();
    }
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.search = target.value;
  }

  onSelectWorkspace(workspaceId: number): void {
    this.selectWorkspace.emit(workspaceId);
    this.closeMenu();
  }

  onManageWorkspace(): void {
    if (!this.activeWorkspace) {
      return;
    }
    this.manageWorkspace.emit(this.activeWorkspace.id);
    this.closeMenu();
  }

  onOpenWorkspaces(): void {
    this.openWorkspaces.emit();
    this.closeMenu();
  }

  onOpenProfile(): void {
    this.openProfile.emit();
    this.closeMenu();
  }

  onCreateWorkspace(): void {
    this.createWorkspace.emit();
    this.closeMenu();
  }

  onLogout(): void {
    this.logout.emit();
    this.closeMenu();
  }
}
