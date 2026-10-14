import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Button, Chips, Field, List, Loading, Screen, Section, Toggle } from '../components/ui';
import { api, Menu, Perm, TeamMember } from '../lib/api';
import { confirm, errorText, goBack, notify } from '../lib/dialog';
import { colors, space, type } from '../theme';

const MENUS: [Menu, string, string][] = [
  ['overview', 'Overview', 'Home screen with figures and recent cases'],
  ['whatsnew', "What's New", 'Guides and market updates'],
  ['students', 'Students', 'Student records'],
  ['requests', 'Cases', 'Service requests, chats and documents'],
  ['services', 'Services', 'Browse and refer into services'],
  ['wallet', 'Wallet', 'Balance and transactions'],
  ['commissions', 'Commissions', 'Payout rates and history'],
];
const PERMS: [Perm, string, string][] = [
  ['create', 'Create requests', 'Refer students and raise services'],
  ['chat', 'Chat with the desk', 'Send messages on cases and to the RM'],
  ['upload', 'Upload documents', 'Attach files to cases'],
  ['edit', 'Edit student details', 'Change student records'],
  ['withdraw', 'Request withdrawals', 'Move money out of the wallet'],
];
const ROLES = ['Staff', 'Manager'] as const;

export default function TeamMemberScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const headerHeight = useHeaderHeight();
  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [role, setRole] = useState<TeamMember['role']>('Staff');
  const [menus, setMenus] = useState<Menu[]>(['overview', 'whatsnew', 'students', 'requests', 'services']);
  const [perms, setPerms] = useState<Perm[]>(['create', 'chat', 'upload']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.team().then((list) => {
      const m = list.find((x) => x.id === id) ?? null;
      setMember(m);
      if (m) {
        setF({ name: m.name, email: m.email, password: '' });
        setRole(m.role);
        setMenus(m.menus);
        setPerms(m.perms);
      }
    }).catch((e) => setError(errorText(e))).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const flip = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const save = async () => {
    setError('');
    if (!f.name.trim() || !f.email.trim()) return setError('Name and work email are required');
    if (!member && f.password.length < 8) return setError('Set a temporary password of at least 8 characters');
    if (member && f.password && f.password.length < 8) return setError('The new password needs at least 8 characters');
    setBusy(true);
    try {
      const base = { name: f.name.trim(), email: f.email.trim(), role, menus, perms };
      if (member) await api.updateMember(member.id, f.password ? { ...base, password: f.password } : base);
      else await api.addMember({ ...base, password: f.password });
      notify(member ? 'Saved' : 'Team member added', member ? `${base.name}'s access is updated.` : `${base.name} can now sign in with ${base.email} and the password you set.`);
      goBack('/team');
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!member || !(await confirm(`Remove ${member.name}?`, 'They will be signed out and can no longer use your account.', 'Remove', true))) return;
    try {
      await api.removeMember(member.id);
      goBack('/team');
    } catch (e) {
      notify('Could not remove', errorText(e));
    }
  };

  return (
    <Screen edges={['bottom']} keyboardOffset={headerHeight}>
      <Stack.Screen options={{ title: member ? member.name : 'Add team member' }} />
      <Field label="Full name" value={f.name} onChangeText={set('name')} placeholder="Kiran Desai" />
      <Field label="Work email" value={f.email} onChangeText={set('email')} placeholder="name@agency.com" keyboardType="email-address" autoCapitalize="none" />
      <Field
        label={member ? 'New password (leave blank to keep)' : 'Temporary password'}
        value={f.password}
        onChangeText={set('password')}
        placeholder="At least 8 characters"
        autoCapitalize="none"
      />
      <Text style={[type.small, { marginTop: -space.sm, marginBottom: space.lg }]}>Share it with them yourself. They can change it after signing in.</Text>
      <Chips label="Role" options={ROLES} value={role} onChange={(v) => v && setRole(v)} />

      <Section title="What they can see">
        <List>{MENUS.map(([k, l, d]) => <Toggle key={k} title={l} subtitle={d} value={menus.includes(k)} onChange={() => setMenus(flip(menus, k))} />)}</List>
      </Section>
      <Section title="What they can do">
        <List>{PERMS.map(([k, l, d]) => <Toggle key={k} title={l} subtitle={d} value={perms.includes(k)} onChange={() => setPerms(flip(perms, k))} />)}</List>
      </Section>

      {error ? <Text style={[type.small, { color: colors.danger, marginTop: space.lg }]}>{error}</Text> : null}
      <View style={{ gap: space.sm, marginTop: space.xl }}>
        <Button label={member ? 'Save changes' : 'Add member'} onPress={save} loading={busy} />
        {member ? <Button label="Remove from team" variant="ghost" onPress={remove} /> : null}
      </View>
    </Screen>
  );
}
