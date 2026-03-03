import { useState, useEffect, useCallback } from 'react';
import {
  loginWithGitHub,
  getStoredAuth,
  clearAuth,
  type AuthData,
  type Verification,
} from '@/lib/auth';

export function useAuth() {
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load stored auth on mount
  useEffect(() => {
    getStoredAuth().then((stored) => {
      if (stored) setAuth(stored);
    });
  }, []);

  const login = useCallback(async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const authData = await loginWithGitHub((v) => {
        setVerification(v);
      });
      setAuth(authData);
      setVerification(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setVerification(null);
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await clearAuth();
    setAuth(null);
  }, []);

  const cancelLogin = useCallback(() => {
    // Note: the polling will continue in the background until it times out,
    // but we hide the UI immediately. A page reload would fully cancel it.
    setVerification(null);
    setIsLoggingIn(false);
  }, []);

  return {
    auth,
    isAuthenticated: auth !== null,
    isLoggingIn,
    verification,
    error,
    login,
    logout,
    cancelLogin,
  };
}
