import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Chips, Empty, ErrorNote, Feather, Header, IconButton, List, Loading, Screen, StatusPill } from '../../components/ui';
import { api, CaseStatus } from '../../lib/api';
import { ProfileButton } from '../../components/ProfileButton';
import { useAccess } from '../../lib/auth';
import { useApi } from '../../lib/hooks';
import { shortDate } from '../../lib/format';
import { colors, radius, space, type } from '../../theme';

const STATUSES: CaseStatus[] = ['In Progress', 'Pending', 'Completed', 'On Hold'];

export default function Students() {
  const { data, error, refreshing, refresh } = useApi(api.students);
  const services = useApi(api.services);
  const { can } = useAccess();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<CaseStatus | ''>('');
  const nameOf = useMemo(() => Object.fromEntries((services.data ?? []).map((s) => [s.key, s.name])), [services.data]);

  const term = q.trim().toLowerCase();
  const list = (data ?? []).filter((s) => {
    const latest = s.requests[s.requests.length - 1];
    if (status && latest?.status !== status) return false;
    return !term || [s.name, s.code, s.country, s.email, s.phone].join(' ').toLowerCase().includes(term);
  });

  if (!data && !error) return <Loading />;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Header left={<ProfileButton />} title="Students" right={can('create') ? <IconButton name="plus" label="Refer a student" onPress={() => router.push('/refer')} /> : undefined} />

      <View style={styles.search}>
        <Feather name="search" size={16} color={colors.faint} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search name, ID, country" placeholderTextColor={colors.faint} style={styles.input} autoCapitalize="none" />
        {q ? <Feather name="x" size={16} color={colors.muted} onPress={() => setQ('')} /> : null}
      </View>
      <View style={{ marginBottom: space.lg }}><Chips options={STATUSES} value={status} onChange={setStatus} /></View>

      {error && !data ? <ErrorNote message={error} onRetry={refresh} /> : null}
      {data ? (
        list.length ? (
          <List>
            {list.map((s) => {
              const latest = s.requests[s.requests.length - 1];
              return (
                <Pressable key={s.id} onPress={() => router.push(`/student/${s.id}`)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <Text style={[type.body, { fontWeight: '600', flex: 1 }]} numberOfLines={1}>{s.name}</Text>
                    {latest ? <StatusPill status={latest.status} /> : null}
                  </View>
                  <Text style={type.small} numberOfLines={1}>
                    {s.code} · {s.country}{latest ? ` · ${nameOf[latest.service] ?? latest.service}` : ''}{s.requests.length > 1 ? ` +${s.requests.length - 1} more` : ''}
                  </Text>
                  <Text style={[type.small, { fontSize: 12 }]}>Added {shortDate(s.createdAt)}</Text>
                </Pressable>
              );
            })}
          </List>
        ) : (
          <Empty text={data.length ? 'No students match your search.' : 'No students yet. Refer your first one with the + button.'} />
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 44, paddingHorizontal: space.md, backgroundColor: colors.surface, borderRadius: radius.md, marginTop: space.lg, marginBottom: space.md },
  input: { flex: 1, fontSize: 15, color: colors.text, height: 44 },
  row: { paddingHorizontal: space.lg, paddingVertical: 14, gap: 3 },
});
