import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { api, Notification } from './api';
import { useAuth } from './auth';

/* Replies from the service desk and the relationship manager, with an unread marker per person. */

const keyFor = (agentId?: string, memberId?: string) => `uv_seen_${agentId}_${memberId ?? 'owner'}`;

export function useUpdates() {
  const { agent } = useAuth();
  const key = keyFor(agent?.id, agent?.member?.id);
  const [list, setList] = useState<Notification[]>([]);
  const [seen, setSeen] = useState('');

  const load = useCallback(async () => {
    if (!agent) return;
    try {
      const [items, mark] = await Promise.all([api.notifications(), AsyncStorage.getItem(key)]);
      setList(items);
      setSeen(mark ?? '');
    } catch {
      /* offline: keep what we have */
    }
  }, [agent, key]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const markSeen = useCallback(async () => {
    if (!list.length) return;
    await AsyncStorage.setItem(key, list[0].createdAt);
    setSeen(list[0].createdAt);
  }, [key, list]);

  return { list, seen, unread: list.filter((n) => n.createdAt > seen).length, reload: load, markSeen };
}
