export interface OAuth2ProxyUserInfo {
  user?: string;
  email?: string;
  preferred_username?: string;
}

export interface AuthSessionState {
  authenticated: boolean;
  userInfo?: OAuth2ProxyUserInfo;
}
