import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Button, Field, List, Row, Screen, Section, StatusPill } from '../../components/ui';
import { api } from '../../lib/api';
import { useAccess, useAuth } from '../../lib/auth';
import { confirm, errorText } from '../../lib/dialog';
import { longDate } from '../../lib/format';
import { colors, space, type } from '../../theme';

const zoneLabel = (z: string) => z[0] + z.slice(1).toLowerCase();

export default function More() {
  const { agent, setAgent, signOut } = useAuth();
  const { isOwner, member, sees } = useAccess();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', agency: '', city: '', bankAccount: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!agent) return null;

  const startEdit = () => {
    setForm({ name: agent.name, phone: agent.phone, agency: agent.agency, city: agent.city, bankAccount: agent.bankAccount });
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
    <Screen>
      <View style={{ alignItems: 'center', paddingVertical: space.xl, gap: space.sm }}>
        <Avatar name={member?.name ?? agent.name} size={72} />
        <Text style={[type.title, { marginTop: space.sm }]}>{member?.name ?? agent.name}</Text>
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
          <Field label="Bank account for payouts" value={form.bankAccount} onChangeText={set('bankAccount')} placeholder="e.g. HDFC Bank •••• 4821" />
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
            {isOwner ? <Row title={agent.bankAccount || 'Not added yet'} subtitle="Payout bank account" /> : null}
            <Row title={longDate(agent.partnerSince)} subtitle="Partner since" />
          </List>
        </Section>
      )}

      <Section title="Work">
        <List>
          <Row icon="message-circle" title={`Chat with ${agent.rm.name}`} subtitle="Relationship manager" onPress={() => router.push('/rm')} />
          {sees('whatsnew') ? <Row icon="book-open" title="What's New" subtitle="Guides and market updates" onPress={() => router.push('/whatsnew')} /> : null}
          {sees('services') ? <Row icon="grid" title="Services" subtitle="Browse and refer into any service" onPress={() => router.push('/services')} /> : null}
          {sees('commissions') ? <Row icon="percent" title="Commission structure" onPress={() => router.push('/commissions')} /> : null}
          <Row icon="bell" title="Updates" subtitle="Replies from the desk and your RM" onPress={() => router.push('/updates')} />
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
