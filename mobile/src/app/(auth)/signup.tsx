import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Chips, Feather, Field, IconButton, Screen } from '../../components/ui';
import { emptyKyc, KycForm, kycForm, kycProblem } from '../../components/onboarding';
import type { KycFiles, KycValues } from '../../components/onboarding';
import { api } from '../../lib/api';
import { colors, radius, space, type } from '../../theme';

/* Partner application: contact details and a password, then KYC with certificates and consent. The agreement is
   emailed within 48 hours and signed online; sign-in opens once it is signed. */

const ZONES = ['NORTH', 'SOUTH', 'EAST', 'WEST'] as const;
const title = (z: string) => z[0] + z.slice(1).toLowerCase();

export default function Signup() {
  const [step, setStep] = useState<1 | 2>(1);
  const [f, setF] = useState({ name: '', email: '', phone: '', city: '', agency: '' });
  const [zone, setZone] = useState<(typeof ZONES)[number] | ''>('');
  const [pw, setPw] = useState({ password: '', confirm: '' });
  const [consent, setConsent] = useState(false);
  const [k, setK] = useState<KycValues>(emptyKyc);
  const [files, setFiles] = useState<KycFiles>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ email: string; sla: string } | null>(null);
  const set = (key: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [key]: v }));

  const next = () => {
    setError('');
    if (!f.name.trim() || !f.email.trim() || !f.phone.trim() || !zone || !f.city.trim()) return setError('Fill in your name, email, mobile, zone and city');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setError('Enter a valid email address');
    if (!/^\+?[\d\s-]{10,16}$/.test(f.phone.trim())) return setError('Enter a valid mobile number');
    if (pw.password.length < 8) return setError('Choose a password of at least 8 characters');
    if (pw.password !== pw.confirm) return setError('Passwords do not match');
    setStep(2);
  };
  const submit = async () => {
    setError('');
    const problem = kycProblem(k, files);
    if (problem) return setError(problem);
    if (!consent) return setError('Tick the consent box to submit your application');
    setBusy(true);
    try {
      const form = new FormData();
      for (const [key, val] of Object.entries({ ...f, zone })) form.append(key, String(val).trim());
      form.append('password', pw.password);
      form.append('consent', 'true');
      const r = await api.apply(kycForm(k, files, form));
      setDone({ email: r.email, sla: r.sla });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your application');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={styles.done}>
          <View style={styles.doneIcon}><Feather name="check" size={30} color={colors.positive} /></View>
          <Text style={[type.title, { textAlign: 'center' }]}>Thank you, your details are received</Text>
          <Text style={[type.body, { textAlign: 'center', color: colors.muted }]}>
            Our team will verify your details and email your partner agreement to <Text style={{ fontWeight: '700', color: colors.text }}>{done.email}</Text> for review within <Text style={{ fontWeight: '700', color: colors.text }}>{done.sla}</Text>.
          </Text>
          <View style={styles.steps}>
            {['We verify your PAN, GST / MSME details and documents.', 'You get the agreement by email and sign it online.', 'Once signed, sign in here with your email and the password you chose.'].map((t, i) => (
              <View key={t} style={styles.stepRow}><Text style={styles.stepNo}>{i + 1}</Text><Text style={[type.small, { flex: 1, color: colors.text }]}>{t}</Text></View>
            ))}
          </View>
          <Button label="Back to sign in" onPress={() => router.replace('/login')} style={{ alignSelf: 'stretch', marginTop: space.lg }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <IconButton name="arrow-left" label="Back" onPress={() => (step === 2 ? setStep(1) : router.canGoBack() ? router.back() : router.replace('/login'))} />
      <Text style={[type.display, { marginTop: space.xl }]}>Become a partner</Text>
      <Text style={[type.small, { marginTop: space.xs, marginBottom: space.lg }]}>
        Two short steps. We verify your details and send your agreement within 48 hours.
      </Text>
      <View style={styles.progress}>
        <View style={[styles.bar, styles.barOn]} /><View style={[styles.bar, step === 2 && styles.barOn]} />
      </View>
      <Text style={[type.label, { marginBottom: space.lg }]}>{step === 1 ? 'Step 1 of 2 · Your details' : 'Step 2 of 2 · KYC & documents'}</Text>

      {step === 1 ? (
        <>
          <Field label="Your full name" value={f.name} onChangeText={set('name')} placeholder="Manish Shah" />
          <Field label="Email" value={f.email} onChangeText={set('email')} placeholder="you@agency.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Mobile" value={f.phone} onChangeText={set('phone')} placeholder="+91 98XXX XXXXX" keyboardType="phone-pad" />
          <Field label="Agency / trade name (optional)" value={f.agency} onChangeText={set('agency')} placeholder="Horizon Overseas" />
          <Chips label="Zone" options={ZONES} value={zone} onChange={setZone} format={title} />
          <Field label="City" value={f.city} onChangeText={set('city')} placeholder="Vadodara" />
          <Field label="Create password" value={pw.password} onChangeText={(v) => setPw({ ...pw, password: v })} placeholder="At least 8 characters" secureTextEntry autoCapitalize="none" />
          <Field label="Confirm password" value={pw.confirm} onChangeText={(v) => setPw({ ...pw, confirm: v })} secureTextEntry autoCapitalize="none" />
          {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.md }]}>{error}</Text> : null}
          <Button label="Continue" onPress={next} />
          <Text style={[type.small, { textAlign: 'center', marginTop: space.md }]}>You can sign in with this password once your agreement is signed.</Text>
        </>
      ) : (
        <>
          <KycForm v={k} set={setK} files={files} setFiles={setFiles} />
          <Pressable onPress={() => setConsent(!consent)} style={styles.consent} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
            <View style={[styles.check, consent && styles.checkOn]}>{consent ? <Feather name="check" size={14} color="#fff" /> : null}</View>
            <Text style={[type.small, { flex: 1, color: colors.text }]}>
              I confirm these details are true and consent to UniVerse verifying my PAN{k.type === 'individual' ? ', Aadhaar' : ''} and documents for KYC and tax compliance (TDS / GST) under the Digital Personal Data Protection Act, 2023.
            </Text>
          </Pressable>
          {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.md }]}>{error}</Text> : null}
          <Button label="Submit application" onPress={submit} loading={busy} disabled={!k.type} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 6, marginBottom: space.sm },
  consent: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', marginTop: space.sm, marginBottom: space.lg },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line },
  barOn: { backgroundColor: colors.primary },
  done: { alignItems: 'center', gap: space.md, paddingTop: space.xxl * 1.5 },
  doneIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.positiveTint, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  steps: { alignSelf: 'stretch', gap: space.sm, marginTop: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface },
  stepRow: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  stepNo: { width: 24, height: 24, borderRadius: 12, textAlign: 'center', lineHeight: 24, fontSize: 12, fontWeight: '800', color: '#fff', backgroundColor: colors.primary, overflow: 'hidden' },
});
