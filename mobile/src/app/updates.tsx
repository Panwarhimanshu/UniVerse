import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { Empty, Feather, Screen } from '../components/ui';
import { api } from '../lib/api';
import type { AppNotification, NotificationCategory } from '../lib/api';
import { time } from '../lib/format';
import { CATEGORY_META, routeFor, useUpdates } from '../lib/updates';
import { colors, radius, space, type } from '../theme';

const FILTERS: ('' | NotificationCategory)[] = ['', 'case', 'document', 'message', 'payment', 'account', 'announcement'];

const groupOf = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d >= today) return 'Today';
  if (d >= new Date(today.getTime() - 6 * 864e5)) return 'This week';
  return 'Earlier';
};

export default function NotificationsScreen() {
  const { items: latest, unread, reload, markRead } = useUpdates();
  const [filter, setFilter] = useState<'' | NotificationCategory>('');
  const [list, setList] = useState<AppNotification[] | null>(null);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (f: typeof filter) => {
    try {
      const page = await api.notifications(f);
      setList(page.items);
      setMore(page.more);
    } catch {
      setList((l) => l ?? []);
    }
  }, []);
  useFocusEffect(useCallback(() => { reload(); load(filter); }, [filter])); // eslint-disable-line react-hooks/exhaustive-deps
  // keep read marks in step with the shared state (banner, other screens)
  useEffect(() => {
    setList((l) => l?.map((n) => ({ ...n, read: latest.find((x) => x.id === n.id)?.read ?? n.read })) ?? l);
  }, [latest]);

  const older = async () => {
    if (!list?.length) return;
    setLoading(true);
    try {
      const page = await api.notifications(filter, list[list.length - 1].createdAt);
      setList([...list, ...page.items]);
      setMore(page.more);
    } finally {
      setLoading(false);
    }
  };
  const open = (n: AppNotification) => {
    if (!n.read) {
      markRead([n.id]);
      setList((l) => l?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? l);
    }
    const to = routeFor(n.link);
    if (to) router.push(to as never);
  };
  const readAll = () => {
    markRead('all');
    setList((l) => l?.map((n) => ({ ...n, read: true })) ?? l);
  };

  let lastGroup = '';
  return (
    <Screen edges={['bottom']} onRefresh={() => { reload(); load(filter); }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
              {unread ? <Text style={styles.link} onPress={readAll}>Mark all read</Text> : null}
              <Pressable onPress={() => router.push('/notification-settings')} accessibilityLabel="Notification settings" hitSlop={10}>
                <Feather name="settings" size={19} color={colors.text} />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingBottom: space.lg }}>
        {FILTERS.map((f) => {
          const on = f === filter;
          return (
            <Pressable key={f || 'all'} onPress={() => { setFilter(f); setList(null); }} style={[styles.chip, on && styles.chipOn]}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: on ? '#fff' : colors.text }}>{f ? CATEGORY_META[f].label : 'All'}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {!list ? <ActivityIndicator color={colors.muted} style={{ marginTop: space.xl }} /> : list.length ? (
        <View>
          {list.map((n) => {
            const g = groupOf(n.createdAt);
            const head = g !== lastGroup ? (lastGroup = g) : null;
            const meta = CATEGORY_META[n.category] ?? CATEGORY_META.account;
            return (
              <View key={n.id}>
                {head ? <Text style={[type.label, { marginTop: space.md, marginBottom: space.sm }]}>{head}</Text> : null}
                <Pressable onPress={() => open(n)} style={({ pressed }) => [styles.item, !n.read && styles.unread, pressed && { opacity: 0.7 }]}>
                  <View style={[styles.icon, { backgroundColor: `${meta.color}1A` }]}><Feather name={meta.icon} size={17} color={meta.color} /></View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                      <Text style={[type.body, { flex: 1, fontWeight: n.read ? '500' : '700' }]} numberOfLines={2}>{n.title}</Text>
                      {!n.read ? <View style={styles.dot} /> : null}
                    </View>
                    <Text style={[type.small, { color: n.read ? colors.muted : colors.text }]} numberOfLines={3}>{n.body}</Text>
                    <Text style={[type.small, { fontSize: 12, color: colors.faint }]}>{meta.label} · {time(n.createdAt)}</Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
          {more ? (
            <Pressable onPress={older} style={styles.more} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.muted} /> : <Text style={styles.link}>Show older</Text>}
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Empty text={filter ? `No ${CATEGORY_META[filter].label.toLowerCase()} notifications yet.` : 'No notifications yet. Case updates, replies and payments will show up here.'} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  chip: { paddingHorizontal: 14, height: 32, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  item: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.md, marginBottom: space.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  unread: { backgroundColor: colors.accentTint, borderColor: '#C9DDF3' },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  more: { alignItems: 'center', paddingVertical: space.lg },
});
