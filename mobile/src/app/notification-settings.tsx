import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { ErrorNote, Loading, Screen } from '../components/ui';
import { api } from '../lib/api';
import type { NotificationPref } from '../lib/api';
import { notify } from '../lib/dialog';
import { useApi } from '../lib/hooks';
import { CATEGORY_META } from '../lib/updates';
import { colors, radius, space, type } from '../theme';
import { Feather } from '../components/ui';

/** Push and email per category. In-app notifications are always on. */
export default function NotificationSettings() {
  const { data, error, refresh } = useApi(api.notificationPrefs);
  const [prefs, setPrefs] = useState<NotificationPref[] | null>(null);
  const list = prefs ?? data;
  if (!list) return error ? <ErrorNote message={error} onRetry={refresh} /> : <Loading />;

  const toggle = async (key: NotificationPref['key'], channel: 'push' | 'email', value: boolean) => {
    const before = list;
    setPrefs(list.map((p) => (p.key === key ? { ...p, [channel]: value } : p)));
    try {
      setPrefs(await api.saveNotificationPrefs({ [key]: { [channel]: value } }));
    } catch (e) {
      setPrefs(before);
      notify('Could not save', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  return (
    <Screen edges={['bottom']}>
      <Text style={[type.small, { marginBottom: space.lg }]}>
        Every notification appears in the app. Choose which ones also come as a phone notification or an email.
      </Text>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }} />
        <Text style={styles.col}>Push</Text>
        <Text style={styles.col}>Email</Text>
      </View>
      <View style={styles.card}>
        {list.map((p, i) => {
          const meta = CATEGORY_META[p.key];
          return (
            <View key={p.key} style={[styles.row, i > 0 && styles.sep]}>
              <Feather name={meta.icon} size={18} color={meta.color} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[type.body, { fontWeight: '600' }]}>{p.label}</Text>
                <Text style={type.small}>{p.description}</Text>
              </View>
              <View style={styles.sw}><Switch value={p.push} onValueChange={(v) => toggle(p.key, 'push', v)} trackColor={{ true: colors.accent, false: colors.line }} thumbColor="#fff" accessibilityLabel={`${p.label} push`} /></View>
              <View style={styles.sw}><Switch value={p.email} onValueChange={(v) => toggle(p.key, 'email', v)} trackColor={{ true: colors.accent, false: colors.line }} thumbColor="#fff" accessibilityLabel={`${p.label} email`} /></View>
            </View>
          );
        })}
      </View>
      <Text style={[type.small, { marginTop: space.lg }]}>
        Phone notifications also need to be allowed for UniVerse in your phone settings.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', paddingHorizontal: space.md, marginBottom: 6 },
  col: { width: 56, textAlign: 'center', fontSize: 12, fontWeight: '600', color: colors.muted },
  card: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  sw: { width: 56, alignItems: 'center' },
});
