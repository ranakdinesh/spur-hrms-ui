export type AuthTokens = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
};

type StoredSession = {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt?: number;
};

const SESSION_KEY = "setika.auth.session";

export function storeAuthSession(tokens: AuthTokens, options: { persist?: boolean } = { persist: true }) {
  if (typeof window === "undefined" || !tokens.access_token) {
    return;
  }

  const session: StoredSession = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenType: tokens.token_type || "Bearer",
    expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
  };

  const storage = options.persist === false ? window.sessionStorage : window.localStorage;
  storage.setItem(SESSION_KEY, JSON.stringify(session));
  if (options.persist === false) {
    window.localStorage.removeItem(SESSION_KEY);
  } else {
    window.sessionStorage.removeItem(SESSION_KEY);
  }
}

export function getAuthSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY) || window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as StoredSession;
    if (!session.accessToken) {
      clearAuthSession();
      return null;
    }
    if (session.expiresAt && session.expiresAt <= Date.now()) {
      clearAuthSession();
      return null;
    }
    return session;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function getAccessToken() {
  return getAuthSession()?.accessToken || "";
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export function clearAuthSession() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(SESSION_KEY);
  }
}
