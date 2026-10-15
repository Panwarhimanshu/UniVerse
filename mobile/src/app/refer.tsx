import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Button, Chips, Field, Loading, PickerField, Screen, TileGrid } from '../components/ui';
import { api } from '../lib/api';
import type { Student } from '../lib/api';
import { useAccess } from '../lib/auth';
import { serviceIcon } from '../lib/format';
import { useApi } from '../lib/hooks';
import { colors, space, type } from '../theme';

const OTHER = 'Other';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RequestService() {
  const params = useLocalSearchParams<{ service?: string; studentId?: string }>();
  const headerHeight = useHeaderHeight();
  const { sees } = useAccess();
  const services = useApi(api.services);
  const meta = useApi(api.meta);
  const students = useApi(() => (sees('students') ? api.students() : Promise.resolve([] as Student[])));

  const [f, setF] = useState({ name: '', email: '', phone: '', note: '' });
  const [studentId, setStudentId] = useState('');
  const [destination, setDestination] = useState('');
  const [otherCountry, setOtherCountry] = useState('');
  const [picked, setPicked] = useState<string[]>(params.service ? [params.service] : []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const pickStudent = (id: string) => {
    const s = students.data?.find((x) => x.id === id);
    if (!s || !meta.data) return;
    setStudentId(s.id);
    setF((cur) => ({ ...cur, name: s.name, email: s.email, phone: s.phone }));
    if (meta.data.destinations.includes(s.country)) { setDestination(s.country); setOtherCountry(''); }
    else if (s.country) { setDestination(OTHER); setOtherCountry(s.country); }
  };
  const newStudent = () => {
    setStudentId('');
    setF((cur) => ({ ...cur, name: '', email: '', phone: '' }));
    setDestination('');
    setOtherCountry('');
  };

  // opened from a student's record: start with that student filled in
  useEffect(() => {
    if (params.studentId && students.data && meta.data && !studentId) pickStudent(params.studentId);
  }, [params.studentId, students.data, meta.data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!services.data || !meta.data) return <Loading />;
  const nameOf = Object.fromEntries(services.data.map((s) => [s.key, s.name]));
  const iconOf = Object.fromEntries(services.data.map((s) => [s.key, s.icon]));
  const country = destination === OTHER ? otherCountry : destination;
  const others = (meta.data.countries ?? []).filter((c) => !meta.data!.destinations.includes(c));
  const chosen = students.data?.find((s) => s.id === studentId);
  const emailOk = EMAIL_RE.test(f.email.trim());
  const ready = f.name.trim() && f.phone.trim() && emailOk && country && picked.length;

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const c = await api.refer({ ...f, country, services: picked, studentId: studentId || undefined });
      router.replace(c.opened > 1 ? `/student/${c.student.id}` : `/case/${c.id}`);
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

      {students.data?.length ? (
        <PickerField
          label="Student"
          title="Choose a student"
          placeholder="New student, or choose from your students"
          value={chosen ? `${chosen.name} · ${chosen.code}` : ''}
          items={students.data.map((s) => ({ key: s.id, label: s.name, sub: [s.code, s.phone, s.email].filter(Boolean).join(' · ') }))}
          onPick={pickStudent}
          onClear={newStudent}
        />
      ) : null}

      <Field label="Student name" value={f.name} onChangeText={set('name')} placeholder="Riya Shah" />
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
        <PickerField
          label="Other country"
          title="Choose a country"
          placeholder="Select a country"
          value={otherCountry}
          items={others.map((c) => ({ key: c, label: c }))}
          onPick={setOtherCountry}
        />
      ) : null}
      <TileGrid
        label={picked.length ? `Services · ${picked.length} selected` : 'Services (choose one or more)'}
        options={services.data.map((s) => s.key)}
        value={picked}
        onChange={setPicked}
        format={(k) => nameOf[k]}
        icon={(k) => serviceIcon(iconOf[k])}
      />
      <Field label="Note for the desk (optional)" value={f.note} onChangeText={set('note')} placeholder="Visa interview on 18 Oct, needs GIC first" multiline style={{ height: 80, paddingTop: 12, textAlignVertical: 'top' }} />

      {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.md }]}>{error}</Text> : null}
      <Button
        label={picked.length > 1 ? `Request ${picked.length} services` : 'Request service'}
        onPress={submit}
        loading={busy}
        disabled={!ready}
      />
    </Screen>
  );
}
