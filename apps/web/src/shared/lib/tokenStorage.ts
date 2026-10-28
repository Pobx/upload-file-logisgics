export const TOKEN_KEY = 'docsearch_token';

let currentToken: string | null = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

export const setAuthToken = (token: string | null) => {
  currentToken = token;
  if (typeof localStorage !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
};

export const getAuthToken = () => currentToken;

export const clearAuthToken = () => {
  setAuthToken(null);
};

export interface UserInfo {
  username: string;
  preferred_username?: string;
  roles: string[];
  sub?: string;
}

export const getUserInfo = (): UserInfo | null => {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const decoded = typeof atob !== 'undefined' ? atob(padded) : Buffer.from(padded, 'base64').toString('binary');
    const payload = JSON.parse(decoded);
    let roles: string[] = [];
    if (Array.isArray(payload.roles)) {
      roles = payload.roles;
    } else if (payload.realm_access?.roles) {
      roles = payload.realm_access.roles;
    }
    const username = payload.preferred_username || payload.username || 'User';
    return {
      username,
      preferred_username: payload.preferred_username || username,
      roles: roles.map((r: string) => r.toLowerCase()),
      sub: payload.sub,
    };
  } catch (_) {
    return null;
  }
};
