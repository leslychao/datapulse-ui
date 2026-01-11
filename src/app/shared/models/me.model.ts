// me.model.ts
export interface UserAccountAccess {
  id: number;
  name: string;
  role?: string;
}
export interface MeResponse {
  userId: string;
  username: string | null;
  email: string | null;
  fullName: string | null;
  givenName: string | null;
  familyName: string | null;
  locale: string | null;          // Locale в JSON обычно строка "ru-RU"
  authenticatedAt: string | null; // Instant в JSON строка ISO-8601
}
