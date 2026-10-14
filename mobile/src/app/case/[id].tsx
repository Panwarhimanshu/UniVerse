import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { ErrorNote, Feather, List, Loading, Progress, Row, Section, StatusPill, Timeline } from '../../components/ui';
import { Chat } from '../../components/Chat';
import { api, Case, CaseDoc } from '../../lib/api';
import { useAccess } from '../../lib/auth';
import { errorText, notify } from '../../lib/dialog';
import { useApi } from '../../lib/hooks';
import { docLabel, fileSize, longDate } from '../../lib/format';
import { colors, radius, space, type } from '../../theme';

type Tab = 'overview' | 'messages';

export default function CaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, reload, setData } = useApi(() => api.case(id), [id]);
  const { can, sees } = useAccess();
  const [tab, setTab] = useState<Tab>('overview');
  const [busyDoc, setBusyDoc] = useState<string | null>(null);
  const headerHeight = useHeaderHeight();

  const loadMessages = useCallback(() => api.caseMessages(id), [id]);
  const sendMessage = useCallback((t: string) => api.sendCaseMessage(id, t), [id]);

  const upload = async (slot?: CaseDoc) => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    if (a.size && a.size > 4 * 1024 * 1024) return notify('File too large', 'Documents can be up to 4 MB. Try a smaller scan or photo.');
    setBusyDoc(slot?.id ?? 'new');
    try {
      setData(await api.uploadDoc(id, { uri: a.uri, name: a.name, size: a.size, mimeType: a.mimeType, file: a.file }, slot?.id));
    } catch (e) {
      notify('Upload failed', errorText(e));
    } finally {
      setBusyDoc(null);
    }
  };
  const download = async (d: CaseDoc) => {
    setBusyDoc(d.id);
    try {
      await api.downloadDoc(id, d);
    } catch (e) {
      notify('Download failed', errorText(e));
    } finally {
      setBusyDoc(null);
    }
  };

  if (!data) return error ? <ErrorNote message={error} onRetry={reload} /> : <Loading />;
  const c: Case = data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: c.ref }} />

      <View style={styles.segment}>
        {(['overview', 'messages'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.segBtn, tab === t && styles.segOn]}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: tab === t ? colors.text : colors.muted }}>
              {t === 'overview' ? 'Overview' : 'Messages'}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'messages' ? (
        <Chat
          load={loadMessages}
          send={sendMessage}
          theirName="Service desk"
          placeholder="Message the service desk"
          canSend={can('chat')}
          extraAction={can('upload') ? { icon: 'paperclip', label: 'Attach a document', onPress: () => upload() } : undefined}
          keyboardOffset={headerHeight}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: space.xl, paddingTop: space.md, paddingBottom: space.xxl * 2 }}>
          <Text style={type.title}>{c.student.name}</Text>
          <Text style={[type.small, { marginTop: 2 }]}>{c.serviceName} · {c.student.country}</Text>

          <View style={styles.statusCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <StatusPill status={c.status} />
              <Text style={[type.body, { fontWeight: '600' }]}>{c.progress}%</Text>
            </View>
            <Progress value={c.progress} />
            <Text style={type.small}>Referred {longDate(c.createdAt)}</Text>
          </View>

          <Section title="Progress">
            <Timeline steps={c.timeline} onHold={c.status === 'On Hold'} />
          </Section>

          <Section title="Documents">
            <List>
              {c.docs.map((d) => {
                const canPick = can('upload') && d.status === 'missing';
                return (
                  <Row
                    key={d.id}
                    icon="file-text"
                    title={d.name}
                    subtitle={d.size ? `${fileSize(d.size)} · ${docLabel[d.status]}` : 'Not uploaded yet'}
                    onPress={canPick ? () => upload(d) : d.hasFile ? () => download(d) : undefined}
                    chevron={false}
                    right={
                      busyDoc === d.id ? <ActivityIndicator color={colors.muted} /> :
                      canPick ? <Text style={styles.link}>Upload</Text> :
                      d.hasFile ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                          <StatusPill status={d.status} label={docLabel[d.status]} />
                          <Feather name="download" size={18} color={colors.muted} />
                        </View>
                      ) : <StatusPill status={d.status} label={docLabel[d.status]} />
                    }
                  />
                );
              })}
              {can('upload') ? (
                <Row
                  icon="plus"
                  title="Upload another document"
                  onPress={() => upload()}
                  chevron={false}
                  right={busyDoc === 'new' ? <ActivityIndicator color={colors.muted} /> : undefined}
                />
              ) : null}
            </List>
            <Text style={[type.small, { marginTop: space.sm }]}>PDF or photo, up to 4 MB. The desk reviews every upload.</Text>
          </Section>

          <Section title="Student">
            <List>
              <Row title={c.student.phone || 'Not given'} subtitle="Phone" />
              <Row title={c.student.email || 'Not given'} subtitle="Email" />
              <Row title={c.student.code} subtitle="Student ID" onPress={sees('students') ? () => router.push(`/student/${c.student.id}`) : undefined} />
            </List>
          </Section>

          {c.note ? (
            <Section title="Note for the desk">
              <Text style={type.body}>{c.note}</Text>
            </Section>
          ) : null}

          <Pressable onPress={() => router.push('/rm')} style={styles.rmLink}>
            <Feather name="message-circle" size={16} color={colors.accent} />
            <Text style={{ color: colors.accent, fontWeight: '600' }}>Escalate to your relationship manager</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', marginHorizontal: space.xl, marginTop: space.sm, marginBottom: space.sm, padding: 3, borderRadius: radius.md, backgroundColor: colors.surface },
  segBtn: { flex: 1, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  statusCard: { marginTop: space.xl, padding: space.lg, gap: space.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  link: { color: colors.accent, fontWeight: '600', fontSize: 14 },
  rmLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, marginTop: space.xxl },
});
