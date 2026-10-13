import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Agent, api, setToken, setUnauthorizedHandler } from './api';

const KEY = 'uv_token';

// SecureStore is native-only; fall back to localStorage on web
const store = {
  get: async () => (Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) ?? null : SecureStore.getItemAsync(KEY)),
  set: async (v: string) => (Platform.OS === 'web' ? globalThis.localStorage?.setItem(KEY, v) : SecureStore.setItemAsync(KEY, v)),
  clear: async () => (Platform.OS === 'web' ? globalThis.localStorage?.removeItem(KEY) : SecureStore.deleteItemAsync(KEY)),
};

interface AuthState {
  agent: Agent | null;
  ready: boolean;
  signIn: (token: string, agent: Agent) => Promise<void>;
  signOut: () => Promise<void>;
  setAgent: (a: Agent) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [ready, setReady] = useState(false);

  const signOut = useCallback(async () => {
    setToken(null);
    setAgent(null);
    await store.clear();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    (async () => {
      try {
        const saved = await store.get();
        if (saved) {
          setToken(saved);
          setAgent(await api.me());
        }
      } catch {
        await signOut();
      } finally {
        setReady(true);
      }
    })();
  }, [signOut]);

  const signIn = useCallback(async (token: string, a: Agent) => {
    setToken(token);
    await store.set(token);
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
