import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Button, Feather, Field, Screen } from '../components/ui';
import { api } from '../lib/api';
import { goBack } from '../lib/dialog';
import { colors, radius, space, type } from '../theme';

const UPI_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Add a UPI ID or a bank account to receive withdrawals. The IFSC code fills in the bank and branch. */
export default function AddPayoutMethod() {
  const headerHeight = useHeaderHeight();
  const [kind, setKind] = useState<'upi' | 'bank'>('upi');
  const [upi, setUpi] = useState('');
  const [b, setB] = useState({ holder: '', account: '', confirm: '', ifsc: '' });
  const [bank, setBank] = useState<{ bank: string; branch: string } | null>(null);
  const [ifscError, setIfscError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const ifsc = b.ifsc.trim().toUpperCase();
  useEffect(() => {
    setBank(null);
    setIfscError('');
    if (!IFSC_RE.test(ifsc)) return;
    let live = true;
    api.lookupIfsc(ifsc)
      .then((r) => { if (live) setBank(r.bank ? r : null); })
      .catch((e) => { if (live) setIfscError(e instanceof Error ? e.message : 'Check the IFSC code'); });
    return () => { live = false; };
  }, [ifsc]);

  const account = b.account.replace(/\s+/g, '');
  const mismatch = !!b.confirm && b.confirm.replace(/\s+/g, '') !== account;
  const ready = kind === 'upi'
    ? UPI_RE.test(upi.trim())
    : b.holder.trim().length >= 3 && /^\d{9,18}$/.test(account) && !mismatch && b.confirm.length > 0 && IFSC_RE.test(ifsc) && !ifscError;

  const save = async () => {
    setError('');
    setBusy(true);
    try {
      await api.addPayoutMethod(kind === 'upi' ? { type: 'upi', upi: upi.trim() } : { type: 'bank', holder: b.holder.trim(), accountNumber: account, ifsc });
      goBack('/wallet');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
      setBusy(false);
    }
  };

  return (
    <Screen edges={['bottom']} keyboardOffset={headerHeight}>
      <View style={styles.switch}>
        {(['upi', 'bank'] as const).map((k) => (
          <Pressable key={k} onPress={() => setKind(k)} style={[styles.seg, kind === k && styles.segOn]} accessibilityRole="tab" accessibilityState={{ selected: kind === k }}>
            <Feather name={k === 'upi' ? 'smartphone' : 'briefcase'} size={16} color={kind === k ? '#fff' : colors.text} />
            <Text style={[styles.segText, kind === k && { color: '#fff' }]}>{k === 'upi' ? 'UPI ID' : 'Bank account'}</Text>
          </Pressable>
        ))}
      </View>

      {kind === 'upi' ? (
        <>
          <Field label="UPI ID" value={upi} onChangeText={setUpi} placeholder="yourname@okaxis" autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
            error={upi.trim() && !UPI_RE.test(upi.trim()) ? 'Enter a UPI ID like name@okaxis or 98XXXXXXXX@ybl' : undefined} />
          <Text style={type.small}>Find it in GPay, PhonePe or Paytm under your profile. The money arrives in the bank account linked to it.</Text>
        </>
      ) : (
        <>
          <Field label="Account holder name" value={b.holder} onChangeText={(v) => setB({ ...b, holder: v })} placeholder="As printed on the passbook" />
          <Field label="Account number" value={b.account} onChangeText={(v) => setB({ ...b, account: v.replace(/[^\d ]/g, '') })} keyboardType="number-pad" secureTextEntry placeholder="9 to 18 digits" />
          <Field label="Confirm account number" value={b.confirm} onChangeText={(v) => setB({ ...b, confirm: v.replace(/[^\d ]/g, '') })} keyboardType="number-pad" placeholder="Type it again"
            error={mismatch ? "The account numbers don't match" : undefined} />
          <Field label="IFSC code" value={b.ifsc} onChangeText={(v) => setB({ ...b, ifsc: v.toUpperCase() })} autoCapitalize="characters" autoCorrect={false} placeholder="HDFC0001234" maxLength={11}
            error={ifscError || (b.ifsc.length === 11 && !IFSC_RE.test(ifsc) ? 'IFSC is 4 letters, 0, then 6 letters or digits' : undefined)} />
          {bank ? (
            <View style={styles.bank}>
              <Feather name="check-circle" size={16} color={colors.positive} />
              <Text style={[type.small, { flex: 1, color: colors.text }]}><Text style={{ fontWeight: '700' }}>{bank.bank}</Text> · {bank.branch}</Text>
            </View>
          ) : null}
        </>
      )}

      {error ? <Text style={[type.small, { color: colors.danger, marginTop: space.md }]}>{error}</Text> : null}
      <Button label="Save" onPress={save} loading={busy} disabled={!ready} style={{ marginTop: space.xl }} />
      <View style={styles.safe}>
        <Feather name="lock" size={14} color={colors.muted} />
        <Text style={[type.small, { flex: 1 }]}>Only you can add or remove payout details. We show the last four digits after saving.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switch: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: radius.pill, backgroundColor: colors.surface, marginBottom: space.xl },
  seg: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: radius.pill },
  segOn: { backgroundColor: colors.primary },
  segText: { fontSize: 14, fontWeight: '700', color: colors.text },
  bank: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: -space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.positiveTint },
  safe: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
});
