import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { api, Notification } from './api';
import { useAuth } from './auth';

/* The notification centre: replies from the desk and RM, case updates, money and account notices.
   Checked every 20 seconds while the app is open, when it comes back to the front, and when a push arrives.
   Anything new also refreshes the account, so changes made in the back office (verification, RM) show at once. */

const POLL_MS = 20000;
const keyFor = (agentId?: string, memberId?: string) => `uv_seen_${agentId}_${memberId ?? 'owner'}`;

interface UpdatesState {
  list: Notification[];
  seen: string;
  unread: number;
  /** the newest item that arrived while the app was open, for the in-app banner */
  incoming: Notification | null;
  dismiss: () => void;
  reload: () => Promise<void>;
  markSeen: () => Promise<void>;
}
const Ctx = createContext<UpdatesState | null>(null);

export function UpdatesProvider({ children }: { children: ReactNode }) {
  const { agent, refresh } = useAuth();
  const key = keyFor(agent?.id, agent?.member?.id);
  const [list, setList] = useState<Notification[]>([]);
  const [seen, setSeen] = useState('');
  const [incoming, setIncoming] = useState<Notification | null>(null);
  const newest = useRef<string | null>(null);

  const reload = useCallback(async () => {
    if (!agent) return;
    try {
      const [items, mark] = await Promise.all([api.notifications(), AsyncStorage.getItem(key)]);
      const top = items[0]?.createdAt ?? '';
      // first load only sets the baseline; later loads announce what is new
      if (newest.current !== null && top > newest.current) {
        setIncoming(items[0]);
        refresh();
      }
      newest.current = top;
      setList(items);
      setSeen(mark ?? '');
    } catch {
      /* offline: keep what we have */
    }
  }, [agent?.id, key, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    newest.current = null;
    setList([]);
    setIncoming(null);
    if (!agent) return;
    reload();
    const t = setInterval(() => { if (AppState.currentState === 'active') reload(); }, POLL_MS);
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') { reload(); refresh(); } });
    const push = Platform.OS === 'web' ? null : Notifications.addNotificationReceivedListener(() => reload());
    return () => { clearInterval(t); app.remove(); push?.remove(); };
  }, [agent?.id, agent?.member?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const markSeen = useCallback(async () => {
    if (!list.length) return;
    await AsyncStorage.setItem(key, list[0].createdAt);
    setSeen(list[0].createdAt);
    setIncoming(null);
  }, [key, list]);

  const value = useMemo<UpdatesState>(() => ({
    list, seen, incoming, reload, markSeen,
    unread: list.filter((n) => n.createdAt > seen).length,
    dismiss: () => setIncoming(null),
  }), [list, seen, incoming, reload, markSeen]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUpdates() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUpdates must be used inside UpdatesProvider');
  return ctx;
}

/** Where an item opens: its case, the RM chat, or (account notices) the profile */
export const updateTarget = (n: Notification) => (n.requestId ? `/case/${n.requestId}` : n.from === 'system' ? '/profile' : '/rm');
export const updateLabel = (n: Notification) => n.ref ?? (n.from === 'system' ? 'Your account' : 'Relationship manager');
