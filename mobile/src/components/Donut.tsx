import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { colors, radius, space, type } from '../theme';

/* Same colours, in the same order, as the service mix on the partner portal */
export const MIX_COLORS = ['#0A66C2', '#2FA84F', '#0B2440', '#13BBF9', '#7BD795', '#F59E0B', '#5B6E84', '#B09DFF', '#0FA3B1'];

export interface Slice { key: string; name: string; count: number }

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};
const arc = (cx: number, cy: number, r: number, from: number, to: number) => {
  const s = polar(cx, cy, r, from);
  const e = polar(cx, cy, r, to);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
};

/**
 * Ring chart with a legend. Tap a slice or a legend row to focus it: the slice thickens, the rest fade,
 * and the middle shows its count and share. Tap it again (or the middle) to go back to the total.
 */
export function Donut({ data, unit = 'cases', onOpen }: { data: Slice[]; unit?: string; onOpen?: (key: string) => void }) {
  const [active, setActive] = useState<string | null>(null);
  const [grow, setGrow] = useState(0); // 0 → 1 on first show: the ring draws itself once
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / 700);
      setGrow(1 - (1 - t) ** 3);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const total = data.reduce((n, d) => n + d.count, 0);
  if (!total) return null;
  const size = 168;
  const c = size / 2;
  const stroke = 22;
  const r = c - stroke / 2 - 4;
  const gap = data.length > 1 ? 1.6 : 0; // degrees left between slices, after the rounded ends
  const capDeg = ((stroke / 2) / (2 * Math.PI * r)) * 360; // room the rounded end takes up
  const focus = data.find((d) => d.key === active) ?? null;
  const toggle = (k: string) => setActive((a) => (a === k ? null : k));
  // react-native-svg takes onPress on phones and onClick in the browser preview
  const tap = (k: string) => (Platform.OS === 'web' ? { onClick: () => toggle(k) } : { onPress: () => toggle(k) }) as object;

  let at = 0;
  const slices = data.map((d, i) => {
    const sweep = (d.count / total) * 360 * grow;
    const from = at;
    at += sweep;
    return { ...d, color: MIX_COLORS[i % MIX_COLORS.length], from, to: at };
  });

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={c} cy={c} r={r} stroke={colors.surface} strokeWidth={stroke} fill="none" />
          <G>
            {slices.map((s) => {
              const span = s.to - s.from;
              const inset = Math.min(span / 2 - 0.01, gap / 2 + (span > 2 * capDeg + gap ? capDeg : 0));
              const from = s.from + inset;
              const to = s.to - inset;
              const on = active === s.key;
              const dim = active !== null && !on;
              if (to - from <= 0.05 && span < 360) {
                // very small share: a dot so it still shows
                const p = polar(c, c, r, (s.from + s.to) / 2);
                return <Circle key={s.key} cx={p.x} cy={p.y} r={on ? stroke / 2 + 3 : stroke / 2 - 2} fill={s.color} opacity={dim ? 0.25 : 1} {...tap(s.key)} />;
              }
              return (
                <Path
                  key={s.key}
                  d={span >= 359.9 ? arc(c, c, r, 0, 359.99) : arc(c, c, r, from, to)}
                  stroke={s.color}
                  strokeWidth={on ? stroke + 6 : stroke}
                  strokeLinecap={span >= 359.9 ? 'butt' : 'round'}
                  fill="none"
                  opacity={dim ? 0.25 : 1}
                  {...tap(s.key)}
                />
              );
            })}
          </G>
        </Svg>
        <Pressable style={styles.center} onPress={() => setActive(null)} accessibilityLabel="Show all">
          <Text style={styles.big}>{focus ? focus.count : total}</Text>
          <Text style={styles.sub} numberOfLines={2}>
            {focus ? `${Math.round((focus.count / total) * 100)}% of ${unit}` : unit.toUpperCase()}
          </Text>
        </Pressable>
      </View>

      <View style={styles.legend}>
        {slices.map((s) => {
          const on = active === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => toggle(s.key)}
              onLongPress={onOpen ? () => onOpen(s.key) : undefined}
              style={[styles.row, on && { backgroundColor: `${s.color}14` }, active !== null && !on && { opacity: 0.45 }]}
              accessibilityRole="button"
              accessibilityLabel={`${s.name}: ${s.count} ${unit}, ${Math.round((s.count / total) * 100)} percent`}
              accessibilityState={{ selected: on }}
            >
              <View style={[styles.swatch, { backgroundColor: s.color }]} />
              <Text style={[type.small, { flex: 1, color: colors.text, fontWeight: on ? '700' : '500' }]} numberOfLines={1}>{s.name}</Text>
              <Text style={[type.small, { color: colors.text, fontWeight: '700' }]}>{s.count}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.lg },
  center: { position: 'absolute', top: 38, left: 38, right: 38, bottom: 38, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  big: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.8 },
  sub: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: colors.muted, textAlign: 'center', marginTop: 2 },
  legend: { alignSelf: 'stretch', gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 9, paddingHorizontal: space.sm, borderRadius: radius.sm },
  swatch: { width: 10, height: 10, borderRadius: 3 },
});
