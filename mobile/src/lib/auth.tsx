import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Agent, api, Menu, Perm, setToken, setUnauthorizedHandler } from './api';
import { unregisterPush } from './push';

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
  /** why the last session ended, shown on the sign-in screen (e.g. account suspended) */
  notice: string;
  signIn: (token: string, agent: Agent) => Promise<void>;
  signOut: (notice?: string) => Promise<void>;
  setAgent: (a: Agent) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');

  const signOut = useCallback(async (why = '') => {
    await unregisterPush();
    setToken(null);
    setAgent(null);
    setNotice(why);
    await store.clear();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler((message) => { signOut(message); });
    (async () => {
      try {
        const saved = await store.get();
        if (saved) {
          setToken(saved);
          setAgent(await api.me());
        }
      } catch (e) {
        // keep the session if the phone is just offline; drop it if the server rejected it
        if (e instanceof Error && 'status' in e && (e as { status: number }).status !== 0) await signOut(e.message);
      } finally {
        setReady(true);
      }
    })();
  }, [signOut]);

  const signIn = useCallback(async (t: string, a: Agent) => {
    setToken(t);
    await store.set(t);
    setNotice('');
    setAgent(a);
  }, []);

  const value = useMemo(() => ({ agent, ready, notice, signIn, signOut, setAgent }), [agent, ready, notice, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** What the signed-in person may see and do. The account owner can do everything; team members get what the owner allowed. */
export function useAccess() {
  const { agent } = useAuth();
  const member = agent?.member ?? null;
  return {
    isOwner: !member,
    member,
    myName: member?.name ?? agent?.name ?? '',
    sees: (m: Menu) => !member || member.menus.includes(m),
    can: (p: Perm) => !member || member.perms.includes(p),
  };
}
