import { Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Empty, ErrorNote, List, Loading, Row, Screen, StatusPill } from '../components/ui';
import { api } from '../lib/api';
import { useApi } from '../lib/hooks';
import { shortDate } from '../lib/format';
import { space, type } from '../theme';

export default function Team() {
  const { data, error, refresh, refreshing } = useApi(api.team);
  if (error && !data) return <ErrorNote message={error} onRetry={refresh} />;
  if (!data) return <Loading />;

  return (
    <Screen edges={['bottom']} onRefresh={refresh} refreshing={refreshing}>
      <Text style={[type.small, { marginBottom: space.lg }]}>
        Give your staff their own sign-in. They use the normal partner login with their work email and the password you set,
        and only see what you allow.
      </Text>
      {data.length ? (
        <List>
          {data.map((m) => (
            <Row
              key={m.id}
              title={m.name}
              subtitle={`${m.role} · ${m.lastLoginAt ? `last sign-in ${shortDate(m.lastLoginAt)}` : m.email}`}
              right={<StatusPill status={m.status === 'Active' ? 'Completed' : 'Pending'} label={m.status} />}
              onPress={() => router.push(`/team-member?id=${m.id}`)}
            />
          ))}
        </List>
      ) : (
        <Empty text="No team members yet." />
      )}
      <Button label="Add team member" icon="user-plus" onPress={() => router.push('/team-member')} style={{ marginTop: space.xl }} />
    </Screen>
  );
}
