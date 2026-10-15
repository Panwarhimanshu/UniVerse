import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Button, Empty, ErrorNote, Feather, Header, List, Loading, Screen, Section, Stat } from '../../components/ui';
import { CaseRow } from '../../components/CaseRow';
import { ProfileButton } from '../../components/ProfileButton';
import { api } from '../../lib/api';
import { useAccess, useAuth } from '../../lib/auth';
import { useApi } from '../../lib/hooks';
import { inr } from '../../lib/format';
import { useUpdates } from '../../lib/updates';
import { colors, radius, space, type } from '../../theme';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function Home() {
  const { agent } = useAuth();
  const { myName, sees, can, member } = useAccess();
  const { data, error, refreshing, refresh } = useApi(api.dashboard);
  const updates = useUpdates();

  if (!data && !error) return <Loading />;
  const month = new Date().toLocaleDateString('en-GB', { month: 'short' });
  const total = data?.mix.reduce((n, m) => n + m.count, 0) ?? 0;

  return (
    <Screen onRefresh={() => { refresh(); updates.reload(); }} refreshing={refreshing}>
      <Header
        left={<ProfileButton />}
        subtitle={greeting()}
        title={myName.split(' ')[0]}
        right={
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Pressable onPress={() => router.push('/updates')} accessibilityLabel={`Notifications${updates.unread ? `, ${updates.unread} unread` : ''}`} hitSlop={8} style={styles.iconBtn}>
              <Feather name="bell" size={20} color={colors.text} />
              {updates.unread ? <View style={styles.count}><Text style={styles.countText}>{updates.unread > 9 ? '9+' : updates.unread}</Text></View> : null}
            </Pressable>
            {can('create') ? (
              <Pressable onPress={() => router.push('/refer')} accessibilityLabel="Request a service" hitSlop={8} style={styles.iconBtn}>
                <Feather name="plus" size={20} color={colors.text} />
              </Pressable>
            ) : null}
          </View>
        }
      />
      {member ? <Text style={type.small}>{member.role} at {agent?.agency || agent?.name}</Text> : null}

      {error && !data ? <ErrorNote message={error} onRetry={refresh} /> : null}

      {data ? (
        <>
          <View style={styles.stats}>
            <Stat label="Active cases" value={String(data.stats.activeCases)} />
            <Stat label="Students" value={String(data.stats.students)} />
          </View>
          {sees('wallet') && data.stats.balance !== null ? (
            <View style={[styles.stats, { marginTop: space.sm }]}>
              <Stat label="Wallet" value={inr(data.stats.balance)} />
              <Stat label={`Earned · ${month}`} value={inr(data.stats.monthEarnings ?? 0)} />
            </View>
          ) : null}

          {updates.unread ? (
            <Pressable onPress={() => router.push('/updates')} style={({ pressed }) => [styles.banner, pressed && { opacity: 0.7 }]}>
              <Feather name="bell" size={18} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { fontWeight: '600' }]}>{updates.unread} unread notification{updates.unread > 1 ? 's' : ''}</Text>
                <Text style={type.small} numberOfLines={1}>{updates.items.find((n) => !n.read)?.title ?? 'Tap to see them'}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.faint} />
            </Pressable>
          ) : null}

          <View style={styles.shortcuts}>
            <Shortcut icon="bar-chart-2" label="Analytics" onPress={() => router.push('/analytics')} />
            {sees('whatsnew') ? <Shortcut icon="book-open" label="What's New" onPress={() => router.push('/whatsnew')} /> : null}
            {sees('services') ? <Shortcut icon="grid" label="Services" onPress={() => router.push('/services')} /> : null}
            {sees('commissions') ? <Shortcut icon="percent" label="Commissions" onPress={() => router.push('/commissions')} /> : null}
          </View>

          {sees('requests') ? (
            <Section title="Recent cases" action={<Text style={styles.link} onPress={() => router.push('/cases')}>View all</Text>}>
              {data.recent.length ? (
                <List>{data.recent.map((c) => <CaseRow key={c.id} c={c} />)}</List>
              ) : (
                <Empty text={can('create') ? 'No cases yet. Request your first service.' : 'No cases yet.'} />
              )}
            </Section>
          ) : null}

          {data.mix.length ? (
            <Section title="Service mix">
              <View style={{ gap: space.md }}>
                {data.mix.slice(0, 5).map((m) => (
                  <View key={m.key} style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={type.small}>{m.name}</Text>
                      <Text style={[type.small, { color: colors.text, fontWeight: '600' }]}>{m.count}</Text>
                    </View>
                    <View style={styles.bar}><View style={[styles.barFill, { width: `${(m.count / total) * 100}%` }]} /></View>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          <Section title="Your relationship manager">
            <Pressable onPress={() => router.push('/rm')} style={({ pressed }) => [styles.rm, pressed && { opacity: 0.7 }]}>
              <Avatar name={agent?.rm.name ?? 'RM'} />
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { fontWeight: '600' }]}>{agent?.rm.name}</Text>
                <Text style={type.small}>Replies within one business day</Text>
              </View>
              <Feather name="message-circle" size={20} color={colors.text} />
            </Pressable>
          </Section>

          {can('create') ? <Button label="Request a service" icon="plus" onPress={() => router.push('/refer')} style={{ marginTop: space.xl }} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

function Shortcut({ icon, label, onPress }: { icon: 'bar-chart-2' | 'book-open' | 'grid' | 'percent'; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.shortcut, pressed && { opacity: 0.7 }]}>
      <Feather name={icon} size={18} color={colors.text} />
      <Text style={[type.small, { color: colors.text, fontWeight: '600' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  link: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  count: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
  countText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  dot: { position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.positive, borderWidth: 2, borderColor: colors.bg },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.accentTint },
  shortcuts: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  shortcut: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: space.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.surface, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.text },
  rm: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
});
