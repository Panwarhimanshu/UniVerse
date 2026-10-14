import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Chips, Empty, ErrorNote, Feather, Header, IconButton, List, Screen } from '../../components/ui';
import { CaseRow } from '../../components/CaseRow';
import { ProfileButton } from '../../components/ProfileButton';
import { api, CaseStatus } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { useAccess } from '../../lib/auth';
import { colors, radius, space } from '../../theme';

const STATUSES: CaseStatus[] = ['In Progress', 'Pending', 'Completed', 'On Hold'];

export default function Cases() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<CaseStatus | ''>('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data, error, refreshing, refresh } = useApi(() => api.cases(debounced, status), [debounced, status]);
  const { can } = useAccess();

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Header left={<ProfileButton />} title="Cases" right={can('create') ? <IconButton name="plus" label="Refer a student" onPress={() => router.push('/refer')} /> : undefined} />

      <View style={styles.search}>
        <Feather name="search" size={16} color={colors.faint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, service, country or ref"
          placeholderTextColor={colors.faint}
          style={styles.searchInput}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query ? <Feather name="x" size={16} color={colors.muted} onPress={() => setQuery('')} /> : null}
      </View>

      <View style={{ marginBottom: space.lg }}>
        <Chips options={STATUSES} value={status} onChange={setStatus} />
      </View>

      {error && !data ? <ErrorNote message={error} onRetry={refresh} /> : null}
      {data ? (
        data.length ? <List>{data.map((c) => <CaseRow key={c.id} c={c} />)}</List> : <Empty text="No cases match your filters." />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 44, paddingHorizontal: space.md,
    backgroundColor: colors.surface, borderRadius: radius.md, marginTop: space.lg, marginBottom: space.md,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, height: 44 },
});
