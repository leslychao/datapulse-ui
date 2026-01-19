export interface UserProfileResponse {
  id: number;
  keycloakSub: string;
  email: string;
  fullName: string;
  username: string;
  createdAt: string;
  updatedAt: string;
  recentlyActive: boolean;
  lastActivityAt: string;
}
