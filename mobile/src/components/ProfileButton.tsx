import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { avatarUrl } from '../lib/api';
import { useAccess, useAuth } from '../lib/auth';
import { colors } from '../theme';

/** The signed-in person's photo (or initials), top left of every tab. Opens their profile. */
export function ProfileButton() {
  const { agent } = useAuth();
  const { myName, isOwner, member } = useAccess();
  const photo = avatarUrl(member ? member.avatar : agent?.avatar);
  const initials = myName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <Pressable
      onPress={() => router.push('/profile')}
      accessibilityLabel="Your profile"
      hitSlop={8}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
    >
      {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : <Text style={styles.text}>{initials}</Text>}
      {isOwner && agent?.verified ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 15, fontWeight: '700' },
  photo: { width: 42, height: 42, borderRadius: 21 },
  badge: { position: 'absolute', right: -1, bottom: -1, width: 13, height: 13, borderRadius: 7, backgroundColor: colors.positive, borderWidth: 2, borderColor: colors.bg },
});
