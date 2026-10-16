import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Button, Chips, Field, Loading, PickerField, Screen } from '../components/ui';
import { api } from '../lib/api';
import { useApi } from '../lib/hooks';
import { colors, space, type } from '../theme';

const OTHER = 'Other';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Saves a student record only. Services are requested for them later from Request a service or their record. */
export default function AddStudent() {
  const headerHeight = useHeaderHeight();
  const meta = useApi(api.meta);
  const [f, setF] = useState({ name: '', phone: '', email: '' });
  const [destination, setDestination] = useState('');
  const [otherCountry, setOtherCountry] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  if (!meta.data) return <Loading />;
  const country = destination === OTHER ? otherCountry : destination;
  const others = (meta.data.countries ?? []).filter((c) => !meta.data!.destinations.includes(c));
  const emailOk = EMAIL_RE.test(f.email.trim());
  const ready = f.name.trim() && f.phone.trim() && emailOk && country;

  const save = async () => {
    setError('');
    setBusy(true);
    try {
      const s = await api.addStudent({ ...f, country });
      router.replace(`/student/${s.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
      setBusy(false);
    }
  };

  return (
    <Screen edges={['bottom']} keyboardOffset={headerHeight}>
      <Text style={[type.small, { marginBottom: space.xl }]}>
        Add the student now and request services for them whenever you're ready. Only you and your team can see this record.
      </Text>
      <Field label="Student name" value={f.name} onChangeText={set('name')} placeholder="Riya Shah" autoFocus />
      <Field label="Phone" value={f.phone} onChangeText={set('phone')} placeholder="+91 98XXX XXXXX" keyboardType="phone-pad" />
      <Field
        label="Email"
        value={f.email}
        onChangeText={set('email')}
        placeholder="student@gmail.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={f.email.trim() && !emailOk ? 'Enter a valid email' : undefined}
      />
      <Chips label="Destination" options={[...meta.data.destinations, OTHER]} value={destination} onChange={(v) => { setDestination(v); if (v !== OTHER) setOtherCountry(''); }} />
      {destination === OTHER ? (
        <PickerField label="Other country" title="Choose a country" placeholder="Select a country" value={otherCountry} items={others.map((c) => ({ key: c, label: c }))} onPick={setOtherCountry} />
      ) : null}
      {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.md }]}>{error}</Text> : null}
      <Button label="Add student" icon="user-plus" onPress={save} loading={busy} disabled={!ready} />
    </Screen>
  );
}
