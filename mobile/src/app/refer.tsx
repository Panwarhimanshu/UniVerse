import { useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Button, Chips, Field, Loading, Screen } from '../components/ui';
import { api } from '../lib/api';
import { useApi } from '../lib/hooks';
import { colors, space, type } from '../theme';

export default function Refer() {
  const params = useLocalSearchParams<{ service?: string }>();
  const headerHeight = useHeaderHeight();
  const services = useApi(api.services);
  const meta = useApi(api.meta);

  const [f, setF] = useState({ name: '', email: '', phone: '', note: '' });
  const [country, setCountry] = useState('');
  const [service, setService] = useState(params.service ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  if (!services.data || !meta.data) return <Loading />;
  const nameOf = Object.fromEntries(services.data.map((s) => [s.key, s.name]));

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const c = await api.refer({ ...f, country, service });
      router.replace(`/case/${c.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit');
      setBusy(false);
    }
  };

  return (
      <Screen edges={['bottom']} keyboardOffset={headerHeight}>
        <Text style={[type.small, { marginBottom: space.xl }]}>
          Only you and your team can see this student. Other consultants never will.
        </Text>

        <Field label="Student name" value={f.name} onChangeText={set('name')} placeholder="Riya Shah" />
        <Field label="Phone" value={f.phone} onChangeText={set('phone')} placeholder="+91 98XXX XXXXX" keyboardType="phone-pad" />
        <Field label="Email (optional)" value={f.email} onChangeText={set('email')} placeholder="student@gmail.com" keyboardType="email-address" autoCapitalize="none" />
        <Chips label="Destination" options={meta.data.destinations} value={country} onChange={setCountry} />
        <Chips label="Service" options={services.data.map((s) => s.key)} value={service} onChange={setService} format={(k) => nameOf[k]} />
        <Field label="Note for the desk (optional)" value={f.note} onChangeText={set('note')} placeholder="Visa interview on 18 Oct, needs GIC first" multiline style={{ height: 80, paddingTop: 12, textAlignVertical: 'top' }} />

        {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.md }]}>{error}</Text> : null}
        <Button label="Submit referral" onPress={submit} loading={busy} disabled={!f.name.trim() || !f.phone.trim() || !country || !service} />
      </Screen>
  );
}
