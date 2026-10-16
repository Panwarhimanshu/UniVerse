import { useCallback, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Avatar, Button, Field, List, Row, Screen, Section, StatusPill } from '../components/ui';
import { api, avatarUrl } from '../lib/api';
import { useAccess, useAuth } from '../lib/auth';
import { confirm, errorText, notify } from '../lib/dialog';
import { longDate } from '../lib/format';
import { colors, space, type } from '../theme';

const zoneLabel = (z: string) => z[0] + z.slice(1).toLowerCase();

export default function Profile() {
  const { agent, setAgent, signOut, refresh } = useAuth();
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const { isOwner, member, sees } = useAccess();
  const headerHeight = useHeaderHeight();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', agency: '', city: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  if (!agent) return null;
  const photo = member ? member.avatar : agent.avatar;

  const pickPhoto = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (picked.canceled || !picked.assets[0]) return;
    const a = picked.assets[0];
    if (a.fileSize && a.fileSize > 2 * 1024 * 1024) return notify('Photo too large', 'Choose a photo of 2 MB or less.');
    const mimeType = a.mimeType && /^image\/(jpeg|png|webp|heic|heif)$/.test(a.mimeType) ? a.mimeType : 'image/jpeg';
    setPhotoBusy(true);
    try {
      setAgent(await api.uploadAvatar({ uri: a.uri, name: a.fileName ?? `photo.${mimeType.split('/')[1]}`, mimeType, file: Platform.OS === 'web' ? a.file : undefined }));
    } catch (e) {
      notify('Could not update your photo', errorText(e, 'Please try again.'));
    } finally {
      setPhotoBusy(false);
    }
  };
  const removePhoto = async () => {
    if (!(await confirm('Remove your photo?', 'Your initials will show instead.', 'Remove', true))) return;
    setPhotoBusy(true);
    try {
      setAgent(await api.removeAvatar());
    } catch (e) {
      notify('Could not remove your photo', errorText(e, 'Please try again.'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const startEdit = () => {
    setForm({ name: agent.name, phone: agent.phone, agency: agent.agency, city: agent.city });
    setError('');
    setEditing(true);
  };
  const save = async () => {
    setBusy(true);
    try {
      setAgent(await api.updateMe(form));
      setEditing(false);
    } catch (e) {
      setError(errorText(e, 'Could not save'));
    } finally {
      setBusy(false);
    }
  };
  const askSignOut = async () => {
    if (await confirm('Sign out?', 'You can sign back in with your email and password.', 'Sign out', true)) signOut();
  };
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Screen edges={['bottom']} keyboardOffset={headerHeight}>
      <View style={{ alignItems: 'center', paddingVertical: space.lg, gap: space.sm }}>
        <Pressable onPress={pickPhoto} disabled={photoBusy} accessibilityLabel="Change profile photo" style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <Avatar name={member?.name ?? agent.name} size={84} uri={avatarUrl(photo)} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: space.lg }}>
          <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }} onPress={photoBusy ? undefined : pickPhoto}>
            {photoBusy ? 'Saving…' : photo ? 'Change photo' : 'Add a photo'}
          </Text>
          {photo && !photoBusy ? <Text style={{ color: colors.muted, fontWeight: '600', fontSize: 13 }} onPress={removePhoto}>Remove</Text> : null}
        </View>
        <Text style={[type.title, { marginTop: space.xs }]}>{member?.name ?? agent.name}</Text>
        <Text style={type.small}>{member?.email ?? agent.email}</Text>
        {member ? (
          <StatusPill status="In Progress" label={`${member.role} · ${agent.agency || agent.name}`} />
        ) : agent.verified ? (
          <StatusPill status="Completed" label="Verified partner" />
        ) : (
          <StatusPill status="Pending" label="Verification pending" />
        )}
      </View>

      {editing ? (
        <Section title="Edit profile">
          <Field label="Your name" value={form.name} onChangeText={set('name')} />
          <Field label="Agency" value={form.agency} onChangeText={set('agency')} />
          <Field label="Phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
          <Field label="City" value={form.city} onChangeText={set('city')} />
          {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.md }]}>{error}</Text> : null}
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} style={{ flex: 1 }} />
            <Button label="Save" onPress={save} loading={busy} disabled={!form.name.trim()} style={{ flex: 1 }} />
          </View>
        </Section>
      ) : (
        <Section
          title={isOwner ? 'Your details' : 'Agency'}
          action={isOwner ? <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }} onPress={startEdit}>Edit</Text> : undefined}
        >
          <List>
            <Row title={agent.agency || agent.name} subtitle="Agency" />
            <Row title={`${zoneLabel(agent.zone)}${agent.city ? `, ${agent.city}` : ''}`} subtitle="Zone" />
            {isOwner ? <Row title={agent.phone || 'Not added'} subtitle="Phone" /> : null}
            {isOwner && sees('wallet') ? <Row title="UPI and bank accounts" subtitle="Where withdrawals are paid" onPress={() => router.push('/wallet')} /> : null}
            <Row title={longDate(agent.partnerSince)} subtitle="Partner since" />
          </List>
        </Section>
      )}

      <Section title="Work">
        <List>
          <Row icon="message-circle" title={`Chat with ${agent.rm.name}`} subtitle="Relationship manager" onPress={() => router.push('/rm')} />
          <Row icon="bar-chart-2" title="Your analytics" subtitle="Requests, completion and earnings" onPress={() => router.push('/analytics')} />
          {sees('whatsnew') ? <Row icon="book-open" title="What's New" subtitle="Guides and market updates" onPress={() => router.push('/whatsnew')} /> : null}
          {sees('services') ? <Row icon="grid" title="Services" subtitle="Browse services and request one" onPress={() => router.push('/services')} /> : null}
          {sees('commissions') ? <Row icon="percent" title="Commission structure" onPress={() => router.push('/commissions')} /> : null}
          <Row icon="bell" title="Notifications" subtitle="Case updates, replies and account notices" onPress={() => router.push('/updates')} />
          <Row icon="sliders" title="Notification settings" subtitle="Choose push and email for each kind" onPress={() => router.push('/notification-settings')} />
        </List>
      </Section>

      <Section title="Account">
        <List>
          {isOwner ? <Row icon="file-text" title="Partner agreement" subtitle={agent.agreement.number || 'Your signed agreement'} onPress={() => router.push('/agreement')} /> : null}
          {isOwner ? <Row icon="users" title="Team members" subtitle="Logins and permissions for your staff" onPress={() => router.push('/team')} /> : null}
          <Row icon="key" title="Change password" onPress={() => router.push('/password')} />
          <Row icon="lock" title="Data protection" subtitle="Records are visible only to you, your team and your case desk" />
        </List>
      </Section>

      <Button label="Sign out" variant="ghost" onPress={askSignOut} style={{ marginTop: space.xl }} />
    </Screen>
  );
}
