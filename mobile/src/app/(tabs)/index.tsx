import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Button, Empty, ErrorNote, Feather, Header, IconButton, List, Loading, Screen, Section, Stat } from '../../components/ui';
import { CaseRow } from '../../components/CaseRow';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/hooks';
import { inr } from '../../lib/format';
import { colors, radius, space, type } from '../../theme';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function Home() {
  const { agent } = useAuth();
  const { data, error, refreshing, refresh } = useApi(api.dashboard);

  if (!data && !error) return <Loading />;
  const firstName = agent?.name.split(' ')[0] ?? '';
  const month = new Date().toLocaleDateString('en-GB', { month: 'short' });
  const total = data?.mix.reduce((n, m) => n + m.count, 0) ?? 0;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Header
        subtitle={greeting()}
        title={firstName}
        right={<IconButton name="plus" label="Refer a student" onPress={() => router.push('/refer')} />}
      />

      {error && !data ? <ErrorNote message={error} onRetry={refresh} /> : null}

      {data ? (
        <>
          <View style={styles.stats}>
            <Stat label="Active cases" value={String(data.stats.activeCases)} />
            <Stat label="Students" value={String(data.stats.students)} />
          </View>
          <View style={[styles.stats, { marginTop: space.sm }]}>
            <Stat label="Wallet" value={inr(data.stats.balance)} />
            <Stat label={`Earned · ${month}`} value={inr(data.stats.monthEarnings)} />
          </View>

          <Section
            title="Recent cases"
            action={<Text style={styles.link} onPress={() => router.push('/cases')}>View all</Text>}
          >
            {data.recent.length ? (
              <List>{data.recent.map((c) => <CaseRow key={c.id} c={c} />)}</List>
            ) : (
              <Empty text="No cases yet — refer your first student." />
            )}
          </Section>

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

          <Button label="Refer a student" icon="user-plus" onPress={() => router.push('/refer')} style={{ marginTop: space.xl }} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  link: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.surface, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.text },
  rm: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
});
