import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Chips, Field, IconButton, Screen } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, space, type } from '../../theme';

const ZONES = ['NORTH', 'SOUTH', 'EAST', 'WEST'] as const;
const title = (z: string) => z[0] + z.slice(1).toLowerCase();

export default function Signup() {
  const { signIn } = useAuth();
  const [f, setF] = useState({ name: '', email: '', phone: '', city: '', password: '', confirm: '' });
  const [zone, setZone] = useState<(typeof ZONES)[number] | ''>('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    setError('');
    if (f.password !== f.confirm) return setError('Passwords do not match');
    setBusy(true);
    try {
      const { token, agent } = await api.register({ name: f.name, email: f.email.trim(), phone: f.phone, city: f.city, zone, password: f.password });
      await signIn(token, agent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign up failed');
    } finally {
      setBusy(false);
    }
  };

  return (
      <Screen edges={['top', 'bottom']}>
        <IconButton name="arrow-left" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))} />
        <Text style={[type.display, { marginTop: space.xl }]}>Become a partner</Text>
        <Text style={[type.small, { marginTop: space.xs, marginBottom: space.xxl }]}>
          Earn on nine study-abroad services, with a dedicated relationship manager.
        </Text>

        <Field label="Full name or agency" value={f.name} onChangeText={set('name')} placeholder="Horizon Overseas" />
        <Field label="Email" value={f.email} onChangeText={set('email')} placeholder="you@agency.com" keyboardType="email-address" autoCapitalize="none" />
        <Field label="Phone" value={f.phone} onChangeText={set('phone')} placeholder="+91 98XXX XXXXX" keyboardType="phone-pad" />
        <Chips label="Zone" options={ZONES} value={zone} onChange={setZone} format={title} />
        <Field label="City" value={f.city} onChangeText={set('city')} placeholder="Vadodara" />
        <Field label="Password" value={f.password} onChangeText={set('password')} placeholder="At least 8 characters" secureTextEntry />
        <Field label="Confirm password" value={f.confirm} onChangeText={set('confirm')} placeholder="Repeat password" secureTextEntry />
        {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.md }]}>{error}</Text> : null}

        <Button label="Create account" onPress={submit} loading={busy} disabled={!f.name || !f.email || !zone || !f.password} />
        <View style={{ height: space.md }} />
        <Text style={[type.small, { textAlign: 'center' }]}>By signing up you agree to the partner terms & data policy.</Text>
      </Screen>
  );
}
