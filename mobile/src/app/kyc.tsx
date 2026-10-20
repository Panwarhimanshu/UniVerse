import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Button, Feather, Field, Loading, Screen, StatusPill } from '../components/ui';
import { emptyKyc, KycForm, kycForm, kycProblem, SignaturePad } from '../components/onboarding';
import type { KycFiles, KycValues } from '../components/onboarding';
import { api } from '../lib/api';
import type { Onboarding } from '../lib/api';
import { useAuth } from '../lib/auth';
import { errorText, notify } from '../lib/dialog';
import { longDate } from '../lib/format';
import { colors, radius, space, type } from '../theme';

/* KYC & agreement: complete KYC (partners who joined before onboarding, or anyone sent back), then read and sign
   the Channel Partner Agreement the desk sends. Withdrawals open when both are done. */

const KYC_LABEL = { none: 'Not started', submitted: 'Being verified', verified: 'Verified', rejected: 'Needs changes' } as const;
const KYC_TONE = { none: 'Pending', submitted: 'In Progress', verified: 'Completed', rejected: 'On Hold' } as const;

export default function Kyc() {
  const { refresh: refreshMe } = useAuth();
  const headerHeight = useHeaderHeight();
  const [o, setO] = useState<Onboarding | null>(null);
  const [editing, setEditing] = useState(false);
  const [k, setK] = useState<KycValues>(emptyKyc);
  const [files, setFiles] = useState<KycFiles>({});
  const [signing, setSigning] = useState(false);
  const [name, setName] = useState('');
  const [sig, setSig] = useState('');
  const [accept, setAccept] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = () => api.onboarding().then(setO).catch((e) => notify('Could not load', errorText(e)));
  useFocusEffect(useCallback(() => { load(); }, []));
  if (!o) return <Loading />;
  const kyc = o.kyc;
  const uploaded = Object.fromEntries(kyc.docs.map((d) => [d.kind, d.name]));

  const startEdit = () => {
    setK({
      type: kyc.type ?? '', legalName: kyc.legalName, pan: '', aadhaar: '', entityType: kyc.entityType, gstin: kyc.gstin, udyam: kyc.udyam, cin: kyc.cin,
      signatory: kyc.signatory, designation: kyc.designation, authority: kyc.authority, address: kyc.address, state: kyc.state, pincode: kyc.pincode,
    });
    setFiles({});
    setError('');
    setEditing(true);
  };
  const submitKyc = async () => {
    setError('');
    const p = kycProblem(k, files, kyc.docs.map((d) => d.kind));
    if (p) return setError(p);
    setBusy(true);
    try {
      setO(await api.submitKyc(kycForm(k, files)));
      setEditing(false);
      notify('KYC submitted', 'We verify it within 48 hours and then send your agreement to sign.');
      refreshMe();
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const sign = async () => {
    setError('');
    if (!accept) return setError('Tick the box to confirm you have read and accept the agreement');
    if (name.trim().length < 3) return setError('Type your full name');
    if (!sig) return setError('Draw your signature in the box');
    setBusy(true);
    try {
      setO(await api.signPending({ name: name.trim(), signature: sig, accept: true }));
      setSigning(false);
      notify('Agreement signed', 'The signed copy is in Profile → Partner agreement.');
      refreshMe();
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  return (
    <Screen edges={['bottom']} keyboardOffset={headerHeight} scrollEnabled={!drawing}>
      <View style={[styles.hero, o.canWithdraw && !o.agreement.pending && { backgroundColor: colors.positiveTint }]}>
        <Feather name={o.canWithdraw && !o.agreement.pending ? 'shield' : 'alert-circle'} size={20} color={o.canWithdraw && !o.agreement.pending ? colors.positive : colors.warning} />
        <Text style={[type.small, { flex: 1, color: colors.text }]}>
          {o.canWithdraw
            ? (o.agreement.pending ? 'A revised agreement is ready. Please read and sign it below.' : 'All done. Your KYC is verified and your agreement is signed.')
            : 'Withdrawals open once your KYC is verified and your Channel Partner Agreement is signed.'}
        </Text>
      </View>

      {/* step 1: KYC */}
      <View style={[styles.step, kyc.status === 'verified' && styles.stepOk]}>
        <View style={styles.stepHead}>
          <Text style={[type.heading, { flex: 1 }]}>1. KYC details</Text>
          <StatusPill status={KYC_TONE[kyc.status]} label={KYC_LABEL[kyc.status]} />
        </View>
        {kyc.status === 'rejected' && kyc.note ? <Text style={[type.small, { color: colors.danger }]}>Please fix: {kyc.note}</Text> : null}
        {kyc.type && !editing ? (
          <Text style={type.small}>
            {kyc.type === 'entity' ? `${kyc.legalName} (${kyc.entityType})` : kyc.legalName} · PAN {kyc.pan}{kyc.gstin ? ` · GSTIN ${kyc.gstin}` : ''}{kyc.udyam ? ` · ${kyc.udyam}` : ''}
            {kyc.verifiedAt ? ` · verified ${longDate(kyc.verifiedAt)}` : kyc.submittedAt ? ` · submitted ${longDate(kyc.submittedAt)}` : ''}
          </Text>
        ) : null}
        {!editing && (kyc.status === 'none' || kyc.status === 'rejected') ? (
          <Button label={kyc.status === 'none' ? 'Complete KYC' : 'Update details'} onPress={startEdit} style={{ marginTop: space.md }} />
        ) : null}
        {editing ? (
          <View style={{ marginTop: space.md }}>
            <KycForm v={k} set={setK} files={files} setFiles={setFiles} uploaded={uploaded} />
            {kyc.status === 'rejected' ? <Text style={[type.small, { marginBottom: space.md }]}>For your security, enter your PAN again.</Text> : null}
            {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.md }]}>{error}</Text> : null}
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} style={{ flex: 1 }} />
              <Button label="Submit" onPress={submitKyc} loading={busy} disabled={!k.type} style={{ flex: 1 }} />
            </View>
          </View>
        ) : null}
      </View>

      {/* step 2: agreement */}
      <View style={[styles.step, o.agreement.signed && styles.stepOk]}>
        <View style={styles.stepHead}>
          <Text style={[type.heading, { flex: 1 }]}>2. Channel Partner Agreement</Text>
          <StatusPill status={o.agreement.pending ? 'In Progress' : o.agreement.signed ? 'Completed' : 'Pending'} label={o.agreement.pending ? (o.agreement.signed ? 'Revision to sign' : 'Ready to sign') : o.agreement.signed ? 'Signed' : 'After KYC'} />
        </View>
        {o.agreement.signed ? <Text style={type.small}>Signed on {longDate(o.agreement.signedAt!)} (version {o.agreement.version}). Download it from Profile → Partner agreement.</Text> : null}
        {!o.agreement.signed && !o.agreement.pending ? <Text style={type.small}>We send it within 48 hours of verifying your KYC.</Text> : null}
        {o.agreement.pending && !signing ? (
          <>
            <Text style={type.small}>Agreement {o.agreement.pending.number} was sent on {longDate(o.agreement.pending.sentAt)}. Read it, then sign here.</Text>
            <Button label="Read the agreement (PDF)" variant="secondary" icon="file-text" style={{ marginTop: space.md }}
              onPress={() => api.downloadPendingAgreement(`UniVerse agreement ${o.agreement.pending!.number.replace(/\//g, '-')}.pdf`).catch((e) => notify('Could not open', errorText(e)))} />
            <Button label="Sign the agreement" icon="edit-3" style={{ marginTop: space.sm }} onPress={() => { setName(kyc.signatory || kyc.legalName); setSig(''); setAccept(false); setError(''); setSigning(true); }} />
          </>
        ) : null}
        {o.agreement.pending && signing ? (
          <View style={{ marginTop: space.md }}>
            <Field label="Full name (as signatory)" value={name} onChangeText={setName} />
            <Text style={[type.small, { marginBottom: 6, color: colors.text, fontWeight: '500' }]}>Signature</Text>
            <SignaturePad onChange={setSig} onActive={setDrawing} />
            <Pressable onPress={() => setAccept(!accept)} style={styles.accept} accessibilityRole="checkbox" accessibilityState={{ checked: accept }}>
              <View style={[styles.box, accept && styles.boxOn]}>{accept ? <Feather name="check" size={14} color="#fff" /> : null}</View>
              <Text style={[type.small, { flex: 1, color: colors.text }]}>I have read the Channel Partner Agreement, including Schedules A and B, and I agree to be bound by it.</Text>
            </Pressable>
            {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.md }]}>{error}</Text> : null}
            <Button label="Sign the agreement" onPress={sign} loading={busy} />
            <Button label="Cancel" variant="ghost" onPress={() => setSigning(false)} />
            <Text style={[type.small, { textAlign: 'center' }]}>Your name, the time, your IP address and a fingerprint of the document are recorded with your signature.</Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: space.md, alignItems: 'center', padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.warningTint, marginBottom: space.lg },
  step: { padding: space.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, borderLeftWidth: 4, borderLeftColor: colors.primary, marginBottom: space.md, gap: space.xs },
  stepOk: { borderLeftColor: colors.positive },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs },
  accept: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', marginBottom: space.md },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
