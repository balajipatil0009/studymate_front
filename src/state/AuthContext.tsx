import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api/auth';
import { AUTH_EXPIRED_EVENT, ApiError, tokenStore } from '../api/http';
import type { MeResponse } from '../api/types';

type Status = 'loading' | 'anon' | 'authed';

interface AuthContextValue {
  status: Status;
  user: MeResponse | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<MeResponse | null>(null);

  const refreshUser = useCallback(async () => {
    if (!tokenStore.refresh) {
      setUser(null);
      setStatus('anon');
      return;
    }
    try {
      const me = await authApi.me();
      setUser(me);
      setStatus('authed');
    } catch (err) {
      // Only a rejected credential ends the session. A server/network hiccup
      // (the proxy turns a stopped API into 500) keeps the tokens so the user
      // is not signed out for something on our side.
      const code = err instanceof ApiError ? err.status : 0;
      if (code === 401 || code === 403) {
        tokenStore.clear();
        setUser(null);
        setStatus('anon');
        return;
      }
      setStatus('authed');
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  // Keep retrying while we hold tokens but still have no profile.
  useEffect(() => {
    if (status === 'anon' || user || !tokenStore.refresh) return;
    const timer = window.setTimeout(() => void refreshUser(), 5000);
    return () => window.clearTimeout(timer);
  }, [status, user, refreshUser]);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setStatus('anon');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await authApi.login({ email, password });
    const me = await authApi.me();
    setUser(me);
    setStatus('authed');
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    await authApi.register({ name, email, password });
    const me = await authApi.me();
    setUser(me);
    setStatus('authed');
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    setStatus('anon');
  }, []);

  const value = useMemo(
    () => ({ status, user, login, register, logout, refreshUser }),
    [status, user, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
