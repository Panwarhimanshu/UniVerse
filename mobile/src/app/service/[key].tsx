import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, ErrorNote, Feather, Loading, Screen, Section } from '../../components/ui';
import { api } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { serviceIcon } from '../../lib/format';
import { colors, radius, space, type } from '../../theme';

export default function ServiceDetail() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { data, error, refresh } = useApi(api.services);
  if (!data) return error ? <ErrorNote message={error} onRetry={refresh} /> : <Loading />;
  const s = data.find((x) => x.key === key);
  if (!s) return <ErrorNote message="Service not found" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen edges={[]}>
        <View style={styles.icon}><Feather name={serviceIcon(s.icon)} size={22} color={colors.text} /></View>
        <Text style={[type.display, { marginTop: space.lg }]}>{s.name}</Text>
        <Text style={[type.body, { color: colors.muted, marginTop: space.sm }]}>{s.short}</Text>

        <View style={styles.kpis}>
          {s.kpis.map(([v, l]) => (
            <View key={l} style={{ flex: 1 }}>
              <Text style={[type.heading, { fontSize: 15 }]} numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
              <Text style={[type.small, { fontSize: 12 }]}>{l}</Text>
            </View>
          ))}
        </View>

        <View style={styles.commission}>
          <Text style={type.label}>Your commission</Text>
          <Text style={[type.title, { marginTop: 4 }]}>{s.commission.amount}</Text>
          <Text style={type.small}>{s.commission.note}</Text>
        </View>

        <Section title="About">
          <Text style={type.body}>{s.about}</Text>
        </Section>

        <Section title="How a case moves">
          {s.steps.map((st, i) => (
            <View key={i} style={styles.step}>
              <Text style={styles.stepNum}>{i + 1}</Text>
              <Text style={[type.body, { flex: 1 }]}>{st}</Text>
            </View>
          ))}
        </Section>

        <Section title="What's included">
          {s.features.map((f) => (
            <View key={f} style={styles.feat}>
              <Feather name="check" size={16} color={colors.positive} style={{ marginTop: 2 }} />
              <Text style={[type.body, { flex: 1 }]}>{f}</Text>
            </View>
          ))}
        </Section>

        <Section title="Delivery partners">
          <Text style={type.body}>{s.partners.join(' · ')}</Text>
        </Section>

        <Section title="Details">
          <Text style={type.small}>Turnaround: {s.tat}</Text>
          <Text style={type.small}>Destinations: {s.countries}</Text>
        </Section>
      </Screen>

      <View style={styles.footer}>
        <Button label="Refer a student" onPress={() => router.push({ pathname: '/refer', params: { service: s.key } })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  kpis: { flexDirection: 'row', gap: space.lg, marginTop: space.xl, paddingVertical: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  commission: { marginTop: space.xl, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.surface },
  step: { flexDirection: 'row', gap: space.md, marginBottom: space.md },
  stepNum: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.line, textAlign: 'center', lineHeight: 20, fontSize: 12, fontWeight: '600', color: colors.text },
  feat: { flexDirection: 'row', gap: space.sm, marginBottom: space.sm },
  footer: { padding: space.lg, paddingBottom: space.xl, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.bg },
});
