import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ErrorNote, List, Loading, Row, Screen, Section, StatusPill } from '../components/ui';
import { api } from '../lib/api';
import { useApi } from '../lib/hooks';
import { serviceIcon } from '../lib/format';
import { colors, radius, space, type } from '../theme';

export default function Commissions() {
  const { data, error, refresh } = useApi(api.commissions);
  const [open, setOpen] = useState<string | null>(null);
  if (!data) return error ? <ErrorNote message={error} onRetry={refresh} /> : <Loading />;

  return (
    <Screen edges={['bottom']}>
      <Text style={type.small}>Credited automatically to your wallet when each service reaches its payout step.</Text>

      <Section title="Current rates">
        <List>
          {data.rates.map((r) => (
            <Row
              key={r.key}
              icon={serviceIcon(r.icon)}
              title={r.name}
              subtitle={r.note}
              right={<Text style={[type.body, { fontWeight: '600' }]}>{r.amount}</Text>}
            />
          ))}
        </List>
      </Section>

      <Section title="History">
        <View style={{ gap: space.sm }}>
          {data.history.map((h) => (
            <View key={h.id} style={styles.card}>
              <Pressable onPress={() => setOpen(open === h.id ? null : h.id)} style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { fontWeight: '600' }]}>{h.title}</Text>
                  <Text style={type.small}>{h.effective}</Text>
                </View>
                <StatusPill status={h.status === 'Active' ? 'Completed' : 'Archived'} label={h.status} />
              </Pressable>
              {open === h.id ? (
                <View style={styles.items}>
                  {h.items.map(([name, value]) => (
                    <View key={name} style={styles.item}>
                      <Text style={[type.small, { flex: 1 }]}>{name}</Text>
                      <Text style={[type.small, { flex: 1.3, color: colors.text, textAlign: 'right' }]}>{value}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  items: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm },
  item: { flexDirection: 'row', gap: space.md },
});
