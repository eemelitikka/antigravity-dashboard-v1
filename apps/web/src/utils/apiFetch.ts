type AuthEventDetail = { message?: string };

const AUTH_TOKEN_KEY = 'antigravity_auth_token';
const AUTH_REQUIRED_EVENT = 'auth-required';
const AUTH_CLEARED_EVENT = 'auth-cleared';

const authEvents = new EventTarget();

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function emitAuthRequired(message?: string): void {
  authEvents.dispatchEvent(
    new CustomEvent<AuthEventDetail>(AUTH_REQUIRED_EVENT, { detail: { message } })
  );
}

export function emitAuthCleared(): void {
  authEvents.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
}

export function subscribeAuthEvents(handlers: {
  onRequired: (message?: string) => void;
  onCleared: () => void;
}): () => void {
  const handleRequired = (event: Event) => {
    const detail = (event as CustomEvent<AuthEventDetail>).detail;
    handlers.onRequired(detail?.message);
  };
  const handleCleared = () => handlers.onCleared();

  authEvents.addEventListener(AUTH_REQUIRED_EVENT, handleRequired);
  authEvents.addEventListener(AUTH_CLEARED_EVENT, handleCleared);

  return () => {
    authEvents.removeEventListener(AUTH_REQUIRED_EVENT, handleRequired);
    authEvents.removeEventListener(AUTH_CLEARED_EVENT, handleCleared);
  };
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 || response.status === 403) {
    if (token) {
      setStoredToken(null);
    }
    const data = await response.clone().json().catch(() => ({}));
    emitAuthRequired(data.message || 'Authentication required');
  }

  return response;
}
