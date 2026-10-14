import { Text } from 'react-native';
import { router } from 'expo-router';
import { ErrorNote, List, Loading, Row, Screen, Section } from '../components/ui';
import { api, Service } from '../lib/api';
import { useApi } from '../lib/hooks';
import { serviceIcon } from '../lib/format';
import { space, type } from '../theme';

export default function Services() {
  const { data, error, refreshing, refresh } = useApi(api.services);
  if (!data && !error) return <Loading />;

  // group by category, preserving catalogue order
  const groups = (data ?? []).reduce<Record<string, Service[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <Screen edges={['bottom']} onRefresh={refresh} refreshing={refreshing}>
      <Text style={type.small}>Refer a student into any service and our specialist desks take it from there.</Text>
      {error && !data ? <ErrorNote message={error} onRetry={refresh} /> : null}

      {Object.entries(groups).map(([category, items]) => (
        <Section key={category} title={category}>
          <List>
            {items.map((s) => (
              <Row
                key={s.key}
                icon={serviceIcon(s.icon)}
                title={s.name}
                subtitle={`${s.commission.amount} · ${s.tat}`}
                onPress={() => router.push(`/service/${s.key}`)}
              />
            ))}
          </List>
        </Section>
      ))}
    </Screen>
  );
}
