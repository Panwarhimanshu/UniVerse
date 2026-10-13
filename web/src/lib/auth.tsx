import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api';
import type { Agent } from './api';

interface AuthState {
  agent: Agent | null;
  ready: boolean;
  signIn: (token: string, agent: Agent, remember?: boolean) => void;
  signOut: () => void;
  setAgent: (a: Agent) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [ready, setReady] = useState(false);

  const signOut = useCallback(() => {
    setToken(null);
    setAgent(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    if (!getToken()) {
      setReady(true);
      return;
    }
    api.me().then(setAgent).catch(signOut).finally(() => setReady(true));
  }, [signOut]);

  const signIn = useCallback((t: string, a: Agent, remember = true) => {
    setToken(t, remember);
    setAgent(a);
  }, []);

  const value = useMemo(() => ({ agent, ready, signIn, signOut, setAgent }), [agent, ready, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
