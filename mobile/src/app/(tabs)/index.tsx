import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Empty, ErrorNote, Feather, Header, Loading, Screen } from '../../components/ui';
import type { IconName } from '../../components/ui';
import { CaseRow } from '../../components/CaseRow';
import { Donut } from '../../components/Donut';
import { Orbit } from '../../components/Orbit';
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
  const month = new Date().toLocaleDateString('en-GB', { month: 'long' });
  const money = sees('wallet') && data?.stats.balance !== null && data?.stats.balance !== undefined;
  const firstUnread = updates.items.find((n) => !n.read);

  return (
    <Screen onRefresh={() => { refresh(); updates.reload(); }} refreshing={refreshing}>
      <Header
        left={<ProfileButton />}
        subtitle={greeting()}
        title={myName.split(' ')[0]}
        right={
          <Pressable onPress={() => router.push('/updates')} accessibilityLabel={`Notifications${updates.unread ? `, ${updates.unread} unread` : ''}`} hitSlop={8} style={styles.iconBtn}>
            <Feather name="bell" size={20} color={colors.text} />
            {updates.unread ? <View style={styles.count}><Text style={styles.countText}>{updates.unread > 9 ? '9+' : updates.unread}</Text></View> : null}
          </Pressable>
        }
      />
      {member ? <Text style={[type.small, { marginTop: -4 }]}>{member.role} at {agent?.agency || agent?.name}</Text> : null}

      {error && !data ? <ErrorNote message={error} onRetry={refresh} /> : null}

      {data ? (
        <>
          {/* the one dark card: money if this person can see it, otherwise the case load */}
          <Pressable onPress={() => router.push(money ? '/wallet' : '/cases')} style={({ pressed }) => [styles.hero, pressed && { opacity: 0.94 }]}>
            <Orbit />
            <Text style={styles.heroLabel}>{money ? 'Wallet balance' : 'Active cases'}</Text>
            <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>
              {money ? inr(data.stats.balance ?? 0) : data.stats.activeCases}
            </Text>
            <View style={styles.heroFoot}>
              {money ? (
                <>
                  <HeroFact label={`Earned in ${month}`} value={inr(data.stats.monthEarnings ?? 0)} />
                  <View style={styles.heroRule} />
                  <HeroFact label="Active cases" value={String(data.stats.activeCases)} />
                </>
              ) : (
                <HeroFact label="Students" value={String(data.stats.students)} />
              )}
              <View style={{ flex: 1 }} />
              <View style={styles.heroGo}><Feather name="arrow-up-right" size={16} color="#fff" /></View>
            </View>
          </Pressable>

          {/* what people do most, one tap away */}
          <View style={styles.actions}>
            {can('create') ? <Action icon="plus" label="Request" primary onPress={() => router.push('/refer')} /> : null}
            <Action icon="bar-chart-2" label="Analytics" onPress={() => router.push('/analytics')} />
            {sees('services') ? <Action icon="grid" label="Services" onPress={() => router.push('/services')} /> : null}
            {sees('commissions') ? <Action icon="percent" label="Rates" onPress={() => router.push('/commissions')} /> : null}
            {!can('create') && sees('whatsnew') ? <Action icon="book-open" label="What's new" onPress={() => router.push('/whatsnew')} /> : null}
          </View>

          {updates.unread ? (
            <Pressable onPress={() => router.push('/updates')} style={({ pressed }) => [styles.notice, pressed && { opacity: 0.8 }]}>
              <View style={styles.noticeIcon}><Text style={styles.noticeNum}>{updates.unread > 9 ? '9+' : updates.unread}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={[type.small, { color: colors.muted }]}>{updates.unread === 1 ? 'Unread notification' : 'Unread notifications'}</Text>
                <Text style={[type.body, { fontWeight: '600' }]} numberOfLines={1}>{firstUnread?.title ?? 'Tap to see them'}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.faint} />
            </Pressable>
          ) : null}

          {data.mix.length ? (
            <Card title="Service mix" action={sees('requests') ? <Link label="View all" onPress={() => router.push('/cases')} /> : undefined}>
              <Donut data={data.mix} />
            </Card>
          ) : null}

          {sees('requests') ? (
            <Card title="Recent cases" action={data.recent.length ? <Link label="See all" onPress={() => router.push('/cases')} /> : undefined} flush>
              {data.recent.length ? (
                data.recent.map((c, i) => <View key={c.id} style={i > 0 && styles.sep}><CaseRow c={c} /></View>)
              ) : (
                <Empty text={can('create') ? 'No cases yet. Tap Request to start your first one.' : 'No cases yet.'} />
              )}
            </Card>
          ) : null}

          <Pressable onPress={() => router.push('/rm')} style={({ pressed }) => [styles.rm, pressed && { opacity: 0.85 }]}>
            <Avatar name={agent?.rm.name ?? 'RM'} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={[type.small, { color: colors.muted }]}>Your relationship manager</Text>
              <Text style={[type.body, { fontWeight: '700' }]} numberOfLines={1}>{agent?.rm.name}</Text>
            </View>
            <View style={styles.chat}><Feather name="message-circle" size={18} color={colors.accent} /><Text style={styles.chatText}>Chat</Text></View>
          </Pressable>
        </>
      ) : null}
    </Screen>
  );
}

function HeroFact({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.heroFactLabel}>{label}</Text>
      <Text style={styles.heroFactValue}>{value}</Text>
    </View>
  );
}

function Action({ icon, label, onPress, primary }: { icon: IconName; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && { transform: [{ scale: 0.96 }] }]} accessibilityLabel={label}>
      <View style={[styles.actionIcon, primary && styles.actionPrimary]}>
        <Feather name={icon} size={20} color={primary ? '#fff' : colors.text} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function Card({ title, action, children, flush }: { title: string; action?: React.ReactNode; children: React.ReactNode; flush?: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{title}</Text>
        {action}
      </View>
      <View style={flush ? { marginHorizontal: -space.lg, marginBottom: -space.sm } : undefined}>{children}</View>
    </View>
  );
}

const Link = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} hitSlop={8} style={styles.linkBtn}><Text style={styles.link}>{label}</Text></Pressable>
);

const styles = StyleSheet.create({
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  count: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
  countText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  hero: { marginTop: space.lg, padding: space.xl, paddingBottom: space.lg, borderRadius: 22, backgroundColor: colors.text, overflow: 'hidden' },
  heroLabel: { color: '#A9B8CC', fontSize: 13, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1.2, marginTop: 4 },
  heroFoot: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.xl },
  heroFactLabel: { color: '#8FA1B8', fontSize: 11, fontWeight: '600' },
  heroFactValue: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2 },
  heroRule: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: '#3A5070' },
  heroGo: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },

  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xl, paddingHorizontal: space.xs },
  action: { alignItems: 'center', gap: 6, width: 72 },
  actionIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  actionPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  actionLabel: { fontSize: 12, fontWeight: '600', color: colors.text },

  notice: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xl, padding: space.md, paddingRight: space.lg, borderRadius: radius.lg, backgroundColor: colors.accentTint },
  noticeIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  noticeNum: { color: '#fff', fontWeight: '800', fontSize: 14 },

  card: { marginTop: space.lg, padding: space.lg, paddingTop: space.md, borderRadius: radius.lg + 2, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md, minHeight: 32 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  linkBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line },
  link: { fontSize: 12, color: colors.text, fontWeight: '600' },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line },

  rm: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg, padding: space.lg, borderRadius: radius.lg + 2, backgroundColor: colors.surface },
  chat: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: radius.pill, backgroundColor: colors.bg },
  chatText: { fontSize: 13, fontWeight: '700', color: colors.accent },
});
