import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Case } from '../lib/api';
import { serviceIcon } from '../lib/format';
import { colors, space, type } from '../theme';
import { Feather, Progress, StatusPill } from './ui';

/* service key → icon key used by serviceIcon (same icons as the Services screen) */
const ICON_OF: Record<string, string> = {
  'education-loans': 'loan', 'canada-gic': 'gic', 'german-blocked-account': 'blocked', 'fee-payments': 'remit', 'forex-card': 'forex',
  insurance: 'insurance', 'oshc-ovhc': 'oshc', accommodation: 'housing', 'sim-cards': 'sim',
};

export function CaseRow({ c }: { c: Case }) {
  return (
    <Pressable
      onPress={() => router.push(`/case/${c.id}`)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
    >
      <View style={styles.icon}><Feather name={serviceIcon(ICON_OF[c.service] ?? '')} size={17} color={colors.primary} /></View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.top}>
          <Text style={[type.body, { fontWeight: '600', flex: 1 }]} numberOfLines={1}>{c.student.name}</Text>
          <StatusPill status={c.status} />
        </View>
        <Text style={type.small} numberOfLines={1}>{c.serviceName} · {c.student.country} · {c.ref}</Text>
        {c.status !== 'Completed' ? (
          <View style={styles.prog}>
            <View style={{ flex: 1 }}><Progress value={c.progress} /></View>
            <Text style={[type.small, { fontSize: 12, width: 34, textAlign: 'right' }]}>{c.progress}%</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 14 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondaryTint, marginTop: 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  prog: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 6 },
});
