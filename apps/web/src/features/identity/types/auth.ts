export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
}

export interface UserInfo {
  username: string;
  preferred_username?: string;
  roles: string[];
  sub?: string;
}
