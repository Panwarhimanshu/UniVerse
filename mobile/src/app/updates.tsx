import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Empty, Feather, Screen } from '../components/ui';
import { time } from '../lib/format';
import { useUpdates } from '../lib/updates';
import { colors, radius, space, type } from '../theme';

export default function Updates() {
  const { list, seen, markSeen } = useUpdates();
  // opening this screen counts as reading everything listed
  useFocusEffect(useCallback(() => { markSeen(); }, [markSeen]));

  return (
    <Screen edges={['bottom']}>
      <Text style={[type.small, { marginBottom: space.lg }]}>Replies from the service desk and your relationship manager.</Text>
      {list.length ? (
        <View style={{ gap: space.sm }}>
          {list.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => router.push(n.requestId ? `/case/${n.requestId}` : '/rm')}
              style={({ pressed }) => [styles.item, n.createdAt > seen && styles.fresh, pressed && { opacity: 0.7 }]}
            >
              <Feather name={n.requestId ? 'folder' : 'message-circle'} size={18} color={colors.muted} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[type.small, { fontWeight: '600' }]}>
                  {n.ref ?? 'Relationship manager'}{n.author ? ` · ${n.author}` : ''} · {time(n.createdAt)}
                </Text>
                <Text style={type.body} numberOfLines={3}>{n.text}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <Empty text="No updates yet. Replies from the desk and your RM will show up here." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  fresh: { borderColor: colors.positive, backgroundColor: colors.positiveTint },
});
