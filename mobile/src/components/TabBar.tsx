import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

const BAR_H = 64;
const DOT = 50;

/**
 * Floating pill nav bar in the brand blue. The open tab sits in a white circle that slides between tabs;
 * the others are white icons. Tabs hidden for a team member (href: null) are left out.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((r) => {
    const style = descriptors[r.key].options.tabBarItemStyle as { display?: string } | undefined;
    return style?.display !== 'none';
  });
  const activeKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(0, routes.findIndex((r) => r.key === activeKey));

  const [width, setWidth] = useState(0);
  const slot = routes.length ? width / routes.length : 0;
  const x = useRef(new Animated.Value(0)).current;
  const ready = useRef(false);
  useEffect(() => {
    if (!slot) return;
    const to = activeIndex * slot + (slot - DOT) / 2;
    if (!ready.current) {
      x.setValue(to); // first layout: no slide
      ready.current = true;
      return;
    }
    Animated.spring(x, { toValue: to, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
  }, [activeIndex, slot]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {slot ? <Animated.View style={[styles.dot, { transform: [{ translateX: x }] }]} /> : null}
        {routes.map((route, i) => {
          const { options } = descriptors[route.key];
          const focused = i === activeIndex;
          const label = typeof options.title === 'string' ? options.title : route.name;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={styles.item}
            >
              {options.tabBarIcon?.({ focused, color: focused ? colors.primary : 'rgba(255,255,255,0.78)', size: 24 })}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 6 },
  bar: {
    height: BAR_H, borderRadius: BAR_H / 2, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  dot: {
    position: 'absolute', left: 0, top: (BAR_H - DOT) / 2, width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: '#fff',
    shadowColor: '#062E5A', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  item: { flex: 1, height: BAR_H, alignItems: 'center', justifyContent: 'center' },
});
