import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Empty, ErrorNote, Feather, Header, Loading, Screen } from '../../components/ui';
import type { IconName } from '../../components/ui';
import { CaseRow } from '../../components/CaseRow';
import { Donut } from '../../components/Donut';
import { Orbit } from '../../components/Orbit';
import { ProfileButton } from '../../components/ProfileButton';
import { NotificationBell } from '../../components/HeaderActions';
import { api } from '../../lib/api';
import { useAccess, useAuth } from '../../lib/auth';
import { useApi } from '../../lib/hooks';
import { useUpdates } from '../../lib/updates';
import { colors, radius, space, type } from '../../theme';

/* Case status colours, the same set the website uses, always shown with their label */
const PIPE = [
  { key: 'In Progress', label: 'In progress', color: '#21BFD3' },
  { key: 'Pending', label: 'Pending', color: '#FCD34D' },
  { key: 'On Hold', label: 'On hold', color: '#FCA5A5' },
  { key: 'Completed', label: 'Done', color: '#86EFAC' },
] as const;

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function Home() {
  const { agent } = useAuth();
  const { myName, sees, can, member } = useAccess();
  const { data, error, refreshing, refresh } = useApi(api.dashboard);
  const updates = useUpdates();
  const stats = useApi(api.analytics);
  const totals = stats.data?.totals;
  const byStatus = stats.data?.byStatus;
  const caseTotal = byStatus ? PIPE.reduce((n, p) => n + byStatus[p.key], 0) : 0;

  if (!data && !error) return <Loading />;
  const firstUnread = updates.items.find((n) => !n.read);

  return (
    <Screen onRefresh={() => { refresh(); stats.refresh(); updates.reload(); }} refreshing={refreshing} header={<Header left={<ProfileButton />} subtitle={greeting()} title={myName.split(' ')[0]} right={<NotificationBell />} />}>
      {member ? <Text style={[type.small, { marginTop: -4 }]}>{member.role} at {agent?.agency || agent?.name}</Text> : null}

      {error && !data ? <ErrorNote message={error} onRetry={refresh} /> : null}

      {data ? (
        <>
          {/* the one dark card: where the cases stand and what needs doing (money lives on the Wallet tab) */}
          <Pressable onPress={() => router.push(sees('requests') ? '/cases' : '/students')} style={({ pressed }) => [styles.hero, pressed && { opacity: 0.94 }]}>
            <Orbit />
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>Cases in progress</Text>
                <Text style={styles.heroValue}>{totals?.open ?? data.stats.activeCases}</Text>
              </View>
              <View style={styles.heroSide}>
                <Text style={styles.heroSideValue}>{data.stats.students}</Text>
                <Text style={styles.heroSideLabel}>{data.stats.students === 1 ? 'student' : 'students'}</Text>
              </View>
            </View>

            {byStatus && caseTotal ? (
              <>
                <View style={styles.pipe}>
                  {PIPE.filter((p) => byStatus[p.key]).map((p) => (
                    <View key={p.key} style={{ flex: byStatus[p.key], backgroundColor: p.color }} />
                  ))}
                </View>
                <View style={styles.pipeLegend}>
                  {PIPE.map((p) => (
                    <View key={p.key} style={styles.pipeItem}>
                      <View style={[styles.pipeDot, { backgroundColor: p.color }]} />
                      <Text style={styles.pipeCount}>{byStatus[p.key]}</Text>
                      <Text style={styles.pipeLabel}>{p.label}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            <View style={styles.heroFoot}>
              {totals ? (
                totals.docsNeeded ? (
                  <View style={styles.todo}>
                    <Feather name="file-text" size={14} color="#FCD34D" />
                    <Text style={styles.todoText}>{totals.docsNeeded} document{totals.docsNeeded === 1 ? '' : 's'} still to upload</Text>
                  </View>
                ) : (
                  <View style={styles.todo}>
                    <Feather name="check-circle" size={14} color="#86EFAC" />
                    <Text style={styles.todoText}>{caseTotal ? 'All documents are in' : 'No cases yet'}</Text>
                  </View>
                )
              ) : <View />}
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

function Action({ icon, label, onPress, primary }: { icon: IconName; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && { transform: [{ scale: 0.96 }] }]} accessibilityLabel={label}>
      <View style={[styles.actionIcon, primary && styles.actionPrimary]}>
        <Feather name={icon} size={20} color={primary ? '#fff' : colors.primary} />
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

  hero: { marginTop: space.lg, padding: space.xl, paddingBottom: space.lg, borderRadius: 22, backgroundColor: colors.primary, overflow: 'hidden' },
  heroLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1.2, marginTop: 4 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
  heroSide: { alignItems: 'flex-end', paddingTop: 2 },
  heroSideValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  heroSideLabel: { color: 'rgba(255,255,255,0.68)', fontSize: 11, fontWeight: '600' },
  pipe: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 3, marginTop: space.lg },
  pipeLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.md },
  pipeItem: { alignItems: 'flex-start', gap: 2 },
  pipeDot: { width: 8, height: 8, borderRadius: 2, marginBottom: 2 },
  pipeCount: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pipeLabel: { color: 'rgba(255,255,255,0.68)', fontSize: 11, fontWeight: '600' },
  heroFoot: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.28)' },
  todo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  todoText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  heroGo: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },

  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xl, paddingHorizontal: space.xs },
  action: { alignItems: 'center', gap: 6, width: 72 },
  actionIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondaryTint },
  actionPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionLabel: { fontSize: 12, fontWeight: '600', color: colors.text },

  notice: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xl, padding: space.md, paddingRight: space.lg, borderRadius: radius.lg, backgroundColor: colors.accentTint },
  noticeIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
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
