import { Children, ReactNode, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
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

export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
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

/** Horizontal single-choice chips — a minimal alternative to a select */
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

/* ---------- display ---------- */

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

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
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
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, marginBottom: space.sm },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm },
  list: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.bg },
  listSep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 14, minHeight: 56 },
  rowIcon: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  btn: { height: 50, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.xl },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  input: { height: 48, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 15, color: colors.text, backgroundColor: colors.bg },
  chip: { paddingHorizontal: 14, height: 34, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
  stat: { flex: 1, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.surface, gap: 2 },
});
