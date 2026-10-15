import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { api } from './api';
import type { AppNotification, NotificationCategory, NotificationLink } from './api';
import type { IconName } from '../components/ui';
import { useAuth } from './auth';

/*
  In-app side of the notification engine (server: notify.ts, docs/NOTIFICATIONS.md).
  - The unread count is checked every 20 s while the app is open, when it comes back to the front, and when a push arrives.
  - When something newer than before shows up, the latest page is loaded, the newest unread one is shown as a banner,
    and the account is refreshed, so back-office changes (verification, RM) appear at once.
  - Read state lives on the server, so it matches across phones and the website.
*/

const POLL_MS = 20000;

interface UpdatesState {
  items: AppNotification[];
  unread: number;
  /** the newest notification that arrived while the app was open, for the banner */
  incoming: AppNotification | null;
  dismiss: () => void;
  reload: () => Promise<void>;
  markRead: (ids: string[] | 'all') => Promise<void>;
}
const Ctx = createContext<UpdatesState | null>(null);

export function UpdatesProvider({ children }: { children: ReactNode }) {
  const { agent, refresh } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [incoming, setIncoming] = useState<AppNotification | null>(null);
  const latest = useRef<string | null>(null); // newest createdAt we know about; null until the first load

  const reload = useCallback(async () => {
    try {
      const page = await api.notifications();
      setItems(page.items);
      setUnread(page.unread);
      latest.current = page.items[0]?.createdAt ?? '';
    } catch {
      /* offline: keep what we have */
    }
  }, []);

  const check = useCallback(async () => {
    try {
      const { count, latest: newest } = await api.unreadNotifications();
      setUnread(count);
      if (latest.current !== null && newest && newest > latest.current) {
        const known = latest.current;
        await reload();
        refresh();
        const page = await api.notifications().catch(() => null);
        const fresh = page?.items.find((n) => !n.read && n.createdAt > known);
        if (fresh) setIncoming(fresh);
      }
    } catch {
      /* offline */
    }
  }, [reload, refresh]);

  useEffect(() => {
    latest.current = null;
    setItems([]);
    setUnread(0);
    setIncoming(null);
    if (!agent) return;
    reload();
    const t = setInterval(() => { if (AppState.currentState === 'active') check(); }, POLL_MS);
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') { check(); refresh(); } });
    const push = Platform.OS === 'web' ? null : Notifications.addNotificationReceivedListener(() => check());
    return () => { clearInterval(t); app.remove(); push?.remove(); };
  }, [agent?.id, agent?.member?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = useCallback(async (ids: string[] | 'all') => {
    if (ids !== 'all' && !ids.length) return;
    setItems((list) => list.map((n) => (ids === 'all' || ids.includes(n.id) ? { ...n, read: true } : n)));
    setIncoming((n) => (n && (ids === 'all' || ids.includes(n.id)) ? null : n));
    try {
      setUnread((await api.markNotificationsRead(ids)).unread);
    } catch {
      /* will sync on the next check */
    }
  }, []);

  const value = useMemo<UpdatesState>(() => ({
    items, unread, incoming, reload, markRead, dismiss: () => setIncoming(null),
  }), [items, unread, incoming, reload, markRead]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUpdates() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUpdates must be used inside UpdatesProvider');
  return ctx;
}

/** Screen a notification opens, or null when it only needs reading */
export const routeFor = (link: NotificationLink): string | null => ({
  case: link.id ? `/case/${link.id}` : '/cases', rm: '/rm', wallet: '/wallet', profile: '/profile', whatsnew: '/whatsnew', none: null,
} as Record<NotificationLink['kind'], string | null>)[link.kind] ?? null;

export const CATEGORY_META: Record<NotificationCategory, { label: string; icon: IconName; color: string }> = {
  case: { label: 'Cases', icon: 'folder', color: '#0A66C2' },
  document: { label: 'Documents', icon: 'file-text', color: '#B45309' },
  message: { label: 'Messages', icon: 'message-circle', color: '#0A66C2' },
  payment: { label: 'Payments', icon: 'credit-card', color: '#1E7E39' },
  account: { label: 'Account', icon: 'user-check', color: '#0B2440' },
  announcement: { label: 'News', icon: 'volume-2', color: '#7C3AED' },
};
