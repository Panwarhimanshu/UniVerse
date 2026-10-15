import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from './ui';
import { CATEGORY_META, routeFor, useUpdates } from '../lib/updates';
import { colors, radius, space, type } from '../theme';

/** Slides in from the top when a notification arrives while the app is open. Tap to open it; hides after 6 seconds. */
export function InAppBanner() {
  const { incoming, dismiss, markRead } = useUpdates();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(-160)).current;
  const show = !!incoming && pathname !== '/updates';

  useEffect(() => {
    Animated.spring(y, { toValue: show ? 0 : -160, useNativeDriver: true, bounciness: 4 }).start();
    if (!show) return;
    const t = setTimeout(dismiss, 6000);
    return () => clearTimeout(t);
  }, [show, incoming?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!incoming) return null;
  const n = incoming;
  const meta = CATEGORY_META[n.category] ?? CATEGORY_META.account;
  const open = () => {
    dismiss();
    markRead([n.id]);
    router.push((routeFor(n.link) ?? '/updates') as never);
  };
  return (
    <Animated.View pointerEvents={show ? 'auto' : 'none'} style={[styles.wrap, { top: insets.top + space.sm, transform: [{ translateY: y }] }]}>
      <Pressable onPress={open} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} accessibilityRole="alert">
        <View style={[styles.icon, { backgroundColor: meta.color }]}><Feather name={meta.icon} size={16} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={[type.small, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>{n.title}</Text>
          <Text style={[type.small, { color: colors.text }]} numberOfLines={2}>{n.body}</Text>
        </View>
        <Pressable onPress={dismiss} hitSlop={10} accessibilityLabel="Dismiss"><Feather name="x" size={16} color={colors.muted} /></Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.md, right: space.md, zIndex: 100, elevation: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
    shadowColor: '#0B2440', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
