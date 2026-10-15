import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Empty, Feather, Screen } from '../components/ui';
import { time } from '../lib/format';
import { updateLabel, updateTarget, useUpdates } from '../lib/updates';
import { colors, radius, space, type } from '../theme';

export default function Updates() {
  const { list, seen, markSeen, reload } = useUpdates();
  // opening this screen counts as reading everything listed
  useFocusEffect(useCallback(() => { reload().then(markSeen); }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen edges={['bottom']} onRefresh={reload}>
      <Text style={[type.small, { marginBottom: space.lg }]}>Case updates, replies from the desk and your RM, payments and account notices.</Text>
      {list.length ? (
        <View style={{ gap: space.sm }}>
          {list.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => router.push(updateTarget(n) as never)}
              style={({ pressed }) => [styles.item, n.createdAt > seen && styles.fresh, pressed && { opacity: 0.7 }]}
            >
              <Feather name={n.requestId ? 'folder' : n.from === 'system' ? 'bell' : 'message-circle'} size={18} color={n.createdAt > seen ? colors.accent : colors.muted} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[type.small, { fontWeight: '600' }]}>
                  {updateLabel(n)}{n.author ? ` · ${n.author}` : ''} · {time(n.createdAt)}
                </Text>
                <Text style={type.body} numberOfLines={4}>{n.text}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <Empty text="No notifications yet. Case updates and replies will show up here." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  fresh: { borderColor: colors.accent, backgroundColor: colors.accentTint },
});
