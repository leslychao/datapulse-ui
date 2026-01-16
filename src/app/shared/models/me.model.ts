// me.model.ts
export interface UserAccountAccess {
  id: number;
  name: string;
  role?: string;
}

export interface UserProfileResponse {
  id: number;
  keycloakSub: string;
  email: string | null;
  fullName: string | null;
  username: string | null;
  createdAt: string;
  updatedAt: string;
}
