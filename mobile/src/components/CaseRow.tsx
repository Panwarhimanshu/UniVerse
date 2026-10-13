import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Case } from '../lib/api';
import { colors, space, type } from '../theme';
import { Progress, StatusPill } from './ui';

export function CaseRow({ c }: { c: Case }) {
  return (
    <Pressable
      onPress={() => router.push(`/case/${c.id}`)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
    >
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: space.lg, paddingVertical: 14, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  prog: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 6 },
});
