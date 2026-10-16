import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from './ui';
import { useAccess } from '../lib/auth';
import { useUpdates } from '../lib/updates';
import { colors, space } from '../theme';

/** Notification bell with the unread count; opens the notification centre. Same on every tab. */
export function NotificationBell() {
  const { unread } = useUpdates();
  return (
    <Pressable
      onPress={() => router.push('/updates')}
      accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ''}`}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
    >
      <Feather name="bell" size={20} color={colors.text} />
      {unread ? <View style={styles.count}><Text style={styles.countText}>{unread > 9 ? '9+' : unread}</Text></View> : null}
    </Pressable>
  );
}

/** Right side of a tab header: request a service or add a student (when allowed), and the bell */
export function HeaderActions({ request = false, addStudent = false }: { request?: boolean; addStudent?: boolean }) {
  const { can } = useAccess();
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      {request && can('create') ? (
        <Pressable onPress={() => router.push('/refer')} accessibilityLabel="Request a service" hitSlop={8} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}>
          <Feather name="plus" size={20} color={colors.text} />
        </Pressable>
      ) : null}
      {addStudent && can('create') ? (
        <Pressable onPress={() => router.push('/add-student')} accessibilityLabel="Add a student" hitSlop={8} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}>
          <Feather name="user-plus" size={19} color={colors.text} />
        </Pressable>
      ) : null}
      <NotificationBell />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  count: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
  countText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
