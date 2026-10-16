import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Button, Chips, ErrorNote, Feather, Field, List, Loading, Row, Screen, Section, StatusPill } from '../../components/ui';
import { api, Student } from '../../lib/api';
import { useAccess } from '../../lib/auth';
import { errorText, notify } from '../../lib/dialog';
import { useApi } from '../../lib/hooks';
import { longDate } from '../../lib/format';
import { colors, radius, space, type } from '../../theme';

export default function StudentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const headerHeight = useHeaderHeight();
  const { can } = useAccess();
  const students = useApi(api.students);
  const services = useApi(api.services);
  const meta = useApi(api.meta);
  const [student, setStudent] = useState<Student | null>(null);
  const [f, setF] = useState({ name: '', email: '', phone: '' });
  const [country, setCountry] = useState('');
  const [pick, setPick] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [raising, setRaising] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const s = students.data?.find((x) => x.id === id);
    if (s && s.id !== student?.id) {
      setStudent(s);
      setF({ name: s.name, email: s.email, phone: s.phone });
      setCountry(s.country);
    }
  }, [students.data, id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (students.error && !students.data) return <ErrorNote message={students.error} onRetry={students.refresh} />;
  if (!students.data || !services.data || !meta.data) return <Loading />;
  if (!student) return <ErrorNote message="This student could not be found." />;

  const nameOf = Object.fromEntries(services.data.map((s) => [s.key, s.name]));
  const active = new Set(student.requests.filter((r) => r.status !== 'Completed').map((r) => r.service));
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const changed = f.name !== student.name || f.email !== student.email || f.phone !== student.phone || country !== student.country;

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      setStudent(await api.updateStudent(student.id, { ...f, country }));
      notify('Saved', `${f.name}'s record is updated.`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };
  const raise = async () => {
    setRaising(true);
    try {
      const s = await api.raiseRequests(student.id, pick);
      setStudent(s);
      notify('Requests raised', `${pick.map((k) => nameOf[k]).join(', ')} opened for ${s.name}. You'll find them under Cases.`);
      setPick([]);
    } catch (e) {
      notify('Could not raise requests', errorText(e));
    } finally {
      setRaising(false);
    }
  };

  return (
    <Screen edges={['bottom']} keyboardOffset={headerHeight}>
      <Stack.Screen options={{ title: student.code }} />
      <Text style={type.title}>{student.name}</Text>
      <Text style={[type.small, { marginTop: 2 }]}>{student.country} · added {longDate(student.createdAt)}</Text>

      <Section title="Services">
        {student.requests.length ? (
          <List>
            {student.requests.map((r) => (
              <Row key={r.id} title={nameOf[r.service] ?? r.service} subtitle={`${r.ref} · ${r.progress}%`} right={<StatusPill status={r.status} />} onPress={() => router.push(`/case/${r.id}`)} />
            ))}
          </List>
        ) : <Text style={type.small}>No services yet.</Text>}
      </Section>

      {can('create') ? (
        <Section title={student.requests.length ? "Raise more services" : "Request services"}>
          <Text style={[type.small, { marginBottom: space.md }]}>Tick everything this student needs. Each one becomes its own case.</Text>
          <View style={{ gap: space.sm }}>
            {services.data.map((s) => {
              const taken = active.has(s.key);
              const on = pick.includes(s.key);
              return (
                <Pressable
                  key={s.key}
                  disabled={taken}
                  onPress={() => setPick(on ? pick.filter((k) => k !== s.key) : [...pick, s.key])}
                  style={[styles.pick, on && styles.pickOn, taken && { opacity: 0.5 }]}
                >
                  <Feather name={taken ? 'check-circle' : on ? 'check-square' : 'square'} size={18} color={on || taken ? colors.accent : colors.faint} />
                  <Text style={[type.body, { flex: 1 }]}>{s.name}</Text>
                  {taken ? <Text style={[type.small, { color: colors.positive }]}>Active</Text> : null}
                </Pressable>
              );
            })}
          </View>
          <Button
            label={pick.length ? `Raise ${pick.length} request${pick.length > 1 ? 's' : ''}` : 'Pick services to raise'}
            onPress={raise}
            loading={raising}
            disabled={!pick.length}
            style={{ marginTop: space.lg }}
          />
        </Section>
      ) : null}

      <Section title="Details">
        {can('edit') ? (
          <>
            <Field label="Name" value={f.name} onChangeText={set('name')} />
            <Field label="Phone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
            <Field label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
            <Chips label="Destination" options={meta.data.destinations} value={country} onChange={(v) => v && setCountry(v)} />
            {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.md }]}>{error}</Text> : null}
            <Button label="Save changes" variant="secondary" onPress={save} loading={saving} disabled={!changed || !f.name.trim() || !f.phone.trim()} />
          </>
        ) : (
          <List>
            <Row title={student.phone || 'Not given'} subtitle="Phone" />
            <Row title={student.email || 'Not given'} subtitle="Email" />
          </List>
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pick: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  pickOn: { borderColor: colors.accent, backgroundColor: colors.accentTint },
});
