import { useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Button, Field, List, Row, Screen, Section, StatusPill } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { longDate } from '../../lib/format';
import { colors, space, type } from '../../theme';

const zoneLabel = (z: string) => z[0] + z.slice(1).toLowerCase();

export default function Profile() {
  const { agent, setAgent, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', agency: '', city: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!agent) return null;

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
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };
  const confirmSignOut = () => {
    if (Platform.OS === 'web') return void signOut();
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Screen>
      <View style={{ alignItems: 'center', paddingVertical: space.xl, gap: space.sm }}>
        <Avatar name={agent.name} size={72} />
        <Text style={[type.title, { marginTop: space.sm }]}>{agent.name}</Text>
        <Text style={type.small}>{agent.email}</Text>
        {agent.verified ? <StatusPill status="Completed" label="Verified partner" /> : <StatusPill status="Pending" label="Verification pending" />}
      </View>

      {editing ? (
        <Section title="Edit profile">
          <Field label="Name" value={form.name} onChangeText={set('name')} />
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
        <Section title="Details" action={<Text style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }} onPress={startEdit}>Edit</Text>}>
          <List>
            <Row title={agent.agency || '—'} subtitle="Agency" />
            <Row title={`${zoneLabel(agent.zone)}${agent.city ? ` — ${agent.city}` : ''}`} subtitle="Zone" />
            <Row title={agent.phone || '—'} subtitle="Phone" />
            <Row title={longDate(agent.partnerSince)} subtitle="Partner since" />
          </List>
        </Section>
      )}

      <Section title="Account">
        <List>
          <Row icon="message-circle" title={`Chat with ${agent.rm.name}`} subtitle="Relationship manager" onPress={() => router.push('/rm')} />
          <Row icon="percent" title="Commission structure" onPress={() => router.push('/commissions')} />
          <Row icon="lock" title="Data protection" subtitle="Records are visible only to you and your case desk" />
        </List>
      </Section>

      <Button label="Sign out" variant="ghost" onPress={confirmSignOut} style={{ marginTop: space.xl }} />
    </Screen>
  );
}
