import { useState, useCallback, useEffect } from 'react';
import { 
  apiFetch, 
  getStoredToken, 
  setStoredToken, 
  subscribeAuthEvents, 
  emitAuthCleared 
} from '../utils/apiFetch';

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(() => {
    return getStoredToken();
  });
  const [authRequired, setAuthRequired] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const setToken = useCallback((newToken: string | null) => {
    setStoredToken(newToken);
    setTokenState(newToken);
    setAuthError(null);
    setAuthRequired(false);
    emitAuthCleared();
  }, []);

  const clearToken = useCallback(() => {
    setStoredToken(null);
    setTokenState(null);
    setAuthRequired(true);
  }, []);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    return apiFetch(url, options);
  }, []);

  const checkAuthRequired = useCallback(async () => {
    try {
      const response = await apiFetch('/api/health');
      if (response.status === 401 || response.status === 403) {
        setAuthRequired(true);
        return true;
      }
      setAuthRequired(false);
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    checkAuthRequired();
  }, [checkAuthRequired]);

  useEffect(() => {
    return subscribeAuthEvents({
      onRequired: (message) => {
        setTokenState(getStoredToken());
        setAuthRequired(true);
        setAuthError(message || 'Authentication required');
      },
      onCleared: () => {
        setAuthRequired(false);
        setAuthError(null);
      }
    });
  }, []);

  return {
    token,
    setToken,
    clearToken,
    authRequired,
    setAuthRequired,
    authError,
    authFetch,
    checkAuthRequired,
    isAuthenticated: !authRequired || !!token,
  };
}
