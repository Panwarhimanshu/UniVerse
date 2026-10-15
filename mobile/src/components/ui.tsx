import { Children, ReactNode, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { colors, radius, space, statusTone, type } from '../theme';

export type IconName = keyof typeof Feather.glyphMap;
export { Feather };

/* ---------- layout ---------- */

export function Screen({
  children, scroll = true, onRefresh, refreshing = false, edges = ['top'], padded = true, keyboardOffset = 0,
}: {
  children: ReactNode; scroll?: boolean; onRefresh?: () => void; refreshing?: boolean; edges?: Edge[]; padded?: boolean;
  /** height of any header above the screen (stack screens), so the keyboard offset is right */
  keyboardOffset?: number;
}) {
  const pad = padded ? styles.pad : undefined;
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {/* 'padding' on both platforms: with Android edge-to-edge the window no longer resizes for the keyboard */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={keyboardOffset}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[pad, { paddingBottom: space.xxl }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.muted} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad]}>{children}</View>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Header({ title, subtitle, right, left }: { title: string; subtitle?: string; right?: ReactNode; left?: ReactNode }) {
  return (
    <View style={styles.header}>
      {left}
      <View style={{ flex: 1 }}>
        {subtitle ? <Text style={type.small}>{subtitle}</Text> : null}
        <Text style={type.display}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function Section({ title, action, children, style }: { title?: string; action?: ReactNode; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ marginTop: space.xl }, style]}>
      {title ? (
        <View style={styles.sectionHead}>
          <Text style={type.label}>{title}</Text>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** A grouped list container with hairline separators between children */
export function List({ children }: { children: ReactNode }) {
  const items = Children.toArray(children); // flattens mapped arrays and drops null/false
  return (
    <View style={styles.list}>
      {items.map((c, i) => (
        <View key={i} style={i > 0 ? styles.listSep : undefined}>{c}</View>
      ))}
    </View>
  );
}

export function Row({
  title, subtitle, right, icon, onPress, chevron = !!onPress,
}: {
  title: string; subtitle?: string; right?: ReactNode; icon?: IconName; onPress?: () => void; chevron?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}>
      {icon ? (
        <View style={styles.rowIcon}><Feather name={icon} size={17} color={colors.text} /></View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.body, { fontWeight: '500' }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={type.small} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
      {chevron ? <Feather name="chevron-right" size={18} color={colors.faint} /> : null}
    </Pressable>
  );
}

/* ---------- controls ---------- */

export function Button({
  label, onPress, variant = 'primary', loading, disabled, icon, style,
}: {
  label: string; onPress?: () => void; variant?: 'primary' | 'secondary' | 'ghost'; loading?: boolean; disabled?: boolean; icon?: IconName; style?: ViewStyle;
}) {
  const v = variant === 'primary'
    ? { bg: colors.text, fg: '#fff', border: colors.text }
    : variant === 'secondary'
      ? { bg: colors.bg, fg: colors.text, border: colors.line }
      : { bg: 'transparent', fg: colors.accent, border: 'transparent' };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={16} color={v.fg} /> : null}
          <Text style={{ color: v.fg, fontSize: 15, fontWeight: '600' }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ name, onPress, label }: { name: IconName; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} hitSlop={8} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}>
      <Feather name={name} size={20} color={colors.text} />
    </Pressable>
  );
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={[type.small, { marginBottom: 6, color: colors.text, fontWeight: '500' }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.faint}
        {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={[styles.input, focused && { borderColor: colors.text }, props.style]}
      />
      {error ? <Text style={[type.small, { color: colors.danger, marginTop: 4 }]}>{error}</Text> : null}
    </View>
  );
}

/** Horizontal single-choice chips, used instead of a select */
export function Chips<T extends string>({
  options, value, onChange, label, format,
}: {
  options: readonly T[]; value: T | ''; onChange: (v: T | '') => void; label?: string; format?: (v: T) => string;
}) {
  return (
    <View style={{ marginBottom: label ? space.lg : 0 }}>
      {label ? <Text style={[type.small, { marginBottom: 6, color: colors.text, fontWeight: '500' }]}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {options.map((o) => {
          const on = o === value;
          return (
            <Pressable
              key={o}
              onPress={() => onChange(on ? '' : o)}
              style={[styles.chip, on && { backgroundColor: colors.text, borderColor: colors.text }]}
            >
              <Text style={{ fontSize: 13, fontWeight: '500', color: on ? '#fff' : colors.text }}>{format ? format(o) : o}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Multi-choice tiles in a fixed grid (no scrolling), e.g. services: three per row */
export function TileGrid<T extends string>({
  options, value, onChange, label, format, icon, columns = 3,
}: {
  options: readonly T[]; value: T[]; onChange: (v: T[]) => void; label?: string; format?: (v: T) => string; icon?: (v: T) => IconName; columns?: number;
}) {
  const [width, setWidth] = useState(0);
  const gap = space.sm;
  const tile = width ? (width - gap * (columns - 1)) / columns : 0;
  return (
    <View style={{ marginBottom: label ? space.lg : 0 }}>
      {label ? <Text style={[type.small, { marginBottom: 6, color: colors.text, fontWeight: '500' }]}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {tile ? options.map((o) => {
          const on = value.includes(o);
          return (
            <Pressable
              key={o}
              onPress={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[styles.tile, { width: tile }, on && { backgroundColor: colors.accentTint, borderColor: colors.accent }]}
            >
              {on ? <View style={styles.tileTick}><Feather name="check" size={11} color="#fff" /></View> : null}
              {icon ? <Feather name={icon(o)} size={18} color={on ? colors.accent : colors.muted} /> : null}
              <Text style={{ fontSize: 12, fontWeight: '600', textAlign: 'center', color: on ? colors.accent : colors.text }} numberOfLines={2}>{format ? format(o) : o}</Text>
            </Pressable>
          );
        }) : null}
      </View>
    </View>
  );
}

/** Looks like a field; opens a searchable list. Used for long lists such as countries or students. */
export function PickerField({
  label, value, placeholder, items, onPick, title, onClear,
}: {
  label: string; value: string; placeholder: string; title: string;
  items: { key: string; label: string; sub?: string }[]; onPick: (key: string) => void; onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const list = q.trim() ? items.filter((i) => `${i.label} ${i.sub ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())) : items;
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={[type.small, { marginBottom: 6, color: colors.text, fontWeight: '500' }]}>{label}</Text>
      <Pressable onPress={() => { setQ(''); setOpen(true); }} style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}>
        <Text style={{ flex: 1, fontSize: 15, color: value ? colors.text : colors.faint }} numberOfLines={1}>{value || placeholder}</Text>
        {value && onClear ? (
          <Pressable onPress={onClear} hitSlop={10} accessibilityLabel={`Clear ${label}`}><Feather name="x" size={18} color={colors.muted} /></Pressable>
        ) : <Feather name="chevron-down" size={18} color={colors.muted} />}
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} presentationStyle="pageSheet">
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
          <View style={[styles.pad, { flex: 1 }]}>
            <View style={styles.header}>
              <Text style={[type.title, { flex: 1, fontSize: 20 }]}>{title}</Text>
              <IconButton name="x" label="Close" onPress={() => setOpen(false)} />
            </View>
            <TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={colors.faint} autoCorrect={false} style={[styles.input, { marginBottom: space.md }]} />
            <FlatList
              data={list}
              keyExtractor={(i) => i.key}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Empty text="Nothing matches your search." />}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { onPick(item.key); setOpen(false); }}
                  style={({ pressed }) => [styles.pickRow, pressed && { backgroundColor: colors.surface }]}
                >
                  <Text style={type.body}>{item.label}</Text>
                  {item.sub ? <Text style={type.small}>{item.sub}</Text> : null}
                </Pressable>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

/** On/off row with a title and a one-line explanation */
export function Toggle({ title, subtitle, value, onChange, disabled }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.body, { fontWeight: '500' }]}>{title}</Text>
        {subtitle ? <Text style={type.small}>{subtitle}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: colors.positive, false: colors.line }} thumbColor="#fff" />
    </View>
  );
}

/* ---------- display ---------- */

/** Case stages as recorded by the service desk, with the date each was reached */
export function Timeline({ steps, onHold }: { steps: { title: string; sub: string; done: boolean; now: boolean; at: string | null }[]; onHold?: boolean }) {
  return (
    <View>
      {steps.map((s, i) => (
        <View key={s.title} style={styles.tlItem}>
          <View style={{ alignItems: 'center' }}>
            <View style={[styles.tlDot, s.done && styles.tlDone, s.now && styles.tlNow]}>
              {s.done ? <Feather name="check" size={12} color={colors.positive} /> : <Text style={[type.small, { fontSize: 11, color: s.now ? colors.accent : colors.faint }]}>{i + 1}</Text>}
            </View>
            {i < steps.length - 1 ? <View style={[styles.tlLine, s.done && { backgroundColor: colors.positive }]} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: space.lg }}>
            <Text style={[type.body, { fontWeight: s.done || s.now ? '600' : '400', color: s.done || s.now ? colors.text : colors.muted }]}>{s.title}</Text>
            <Text style={type.small}>
              {s.done && s.at ? `${new Date(s.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ` : s.now ? (onHold ? 'On hold · ' : 'Next · ') : ''}{s.sub}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}


export function StatusPill({ status, label }: { status: string; label?: string }) {
  const tone = statusTone[status] ?? { fg: colors.muted, bg: colors.surface };
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={{ color: tone.fg, fontSize: 12, fontWeight: '600' }}>{label ?? status}</Text>
    </View>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, value))}%` }]} />
    </View>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[type.title, { fontSize: 20 }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={type.small}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, size = 40, uri }: { name: string; size?: number; uri?: string }) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  if (uri) return <Image source={{ uri }} accessibilityLabel={name} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line }}>
      <Text style={{ fontSize: size * 0.36, fontWeight: '600', color: colors.text }}>{initials}</Text>
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return <Text style={[type.small, { textAlign: 'center', paddingVertical: space.xxl }]}>{text}</Text>;
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.muted} />
    </View>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={{ paddingVertical: space.xxl, alignItems: 'center', gap: space.md }}>
      <Text style={[type.small, { textAlign: 'center' }]}>{message}</Text>
      {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: space.xl, paddingTop: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm },
  list: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.bg },
  listSep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 14, minHeight: 56 },
  rowIcon: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  btn: { height: 50, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.xl },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  input: { height: 48, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 15, color: colors.text, backgroundColor: colors.bg },
  tile: { minHeight: 76, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6, paddingVertical: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  tileTick: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  pickRow: { paddingVertical: space.md, paddingHorizontal: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line, gap: 2 },
  chip: { paddingHorizontal: 14, height: 34, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
  stat: { flex: 1, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.surface, gap: 2 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 12 },
  tlItem: { flexDirection: 'row', gap: space.md },
  tlDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  tlDone: { borderColor: colors.positive, backgroundColor: colors.positiveTint },
  tlNow: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  tlLine: { width: 2, flex: 1, backgroundColor: colors.line, marginVertical: 2 },
});
