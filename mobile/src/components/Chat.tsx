import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Message } from '../lib/api';
import { useApi, usePolling } from '../lib/hooks';
import { useAccess, useAuth } from '../lib/auth';
import { time } from '../lib/format';
import { colors, radius, space, type } from '../theme';
import { Feather, IconName, Loading } from './ui';

/**
 * Message thread with composer. Polls for new messages while focused,
 * since replies come from UniVerse staff in the back office.
 */
export function Chat({
  load, send, theirName, placeholder, extraAction, keyboardOffset = 0, canSend = true,
}: {
  load: () => Promise<Message[]>;
  send: (text: string) => Promise<Message>;
  theirName: string;
  placeholder: string;
  extraAction?: { icon: IconName; label: string; onPress: () => void };
  keyboardOffset?: number;
  /** team members without chat permission can read but not reply */
  canSend?: boolean;
}) {
  const { agent } = useAuth();
  const { isOwner, myName } = useAccess();
  // who wrote a partner-side message: the owner leaves no author, team members sign their name
  const partnerLabel = (m: Message) => {
    if (m.author) return m.author === myName && !isOwner ? 'You' : m.author;
    return isOwner ? 'You' : agent?.name ?? 'Owner';
  };
  const { data, setData, reload } = useApi(load);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const scroller = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  usePolling(useCallback(() => { reload(); }, [reload]), 3000);

  const submit = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setSendError('');
    setText('');
    try {
      const m = await send(t);
      setData((prev) => [...(prev ?? []), m]);
    } catch (e) {
      setText(t); // keep the draft so nothing is lost
      setSendError(e instanceof Error ? e.message : 'Message not sent');
    } finally {
      setSending(false);
    }
  };

  if (!data) return <Loading />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={keyboardOffset}
    >
      <ScrollView
        ref={scroller}
        contentContainerStyle={{ padding: space.lg, gap: space.sm }}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
      >
        {data.map((m) =>
          m.from === 'system' ? (
            <Text key={m.id} style={[type.small, styles.system]}>{m.text} · {time(m.createdAt)}</Text>
          ) : (
            <View key={m.id} style={[styles.bubbleWrap, m.from === 'agent' ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
              <View style={[styles.bubble, m.from === 'agent' ? styles.mine : styles.theirs]}>
                <Text style={{ fontSize: 15, lineHeight: 20, color: m.from === 'agent' ? '#fff' : colors.text }}>{m.text}</Text>
              </View>
              <Text style={[type.small, { fontSize: 11, marginTop: 3 }]}>
                {m.from === 'agent' ? partnerLabel(m) : m.author || theirName} · {time(m.createdAt)}
              </Text>
            </View>
          ),
        )}
      </ScrollView>

      {sendError ? <Text style={[type.small, styles.sendError]}>{sendError}. Tap send to try again.</Text> : null}
      {!canSend ? (
        <Text style={[type.small, styles.readOnly, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
          You can read this conversation. Ask your account owner if you need to reply.
        </Text>
      ) : null}
      {canSend ? <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        {extraAction ? (
          <Pressable onPress={extraAction.onPress} accessibilityLabel={extraAction.label} hitSlop={8} style={styles.sideBtn}>
            <Feather name={extraAction.icon} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          style={styles.input}
          multiline
          onSubmitEditing={submit}
          submitBehavior="submit"
        />
        <Pressable
          onPress={submit}
          disabled={!text.trim() || sending}
          accessibilityLabel="Send"
          style={[styles.send, { opacity: text.trim() ? 1 : 0.3 }]}
        >
          <Feather name="arrow-up" size={18} color="#fff" />
        </Pressable>
      </View> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sendError: { color: colors.danger, paddingHorizontal: space.lg, paddingVertical: space.xs },
  readOnly: { textAlign: 'center', paddingHorizontal: space.xl, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  system: { textAlign: 'center', fontSize: 12, marginVertical: space.sm },
  bubbleWrap: { maxWidth: '100%' },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  mine: { backgroundColor: colors.text, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.surface, borderBottomLeftRadius: 6 },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, paddingHorizontal: space.md, paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.bg,
  },
  sideBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1, minHeight: 40, maxHeight: 120, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 15,
    color: colors.text, backgroundColor: colors.surface, borderRadius: radius.lg,
  },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
});
