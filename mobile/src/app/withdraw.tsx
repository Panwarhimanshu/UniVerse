import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Button, Feather, Loading, Screen } from '../components/ui';
import { api } from '../lib/api';
import { useAccess } from '../lib/auth';
import { useApi } from '../lib/hooks';
import { inr } from '../lib/format';
import { colors, radius, space, type } from '../theme';

export default function Withdraw() {
  const { data, refresh } = useApi(api.wallet);
  const { isOwner } = useAccess();
  const headerHeight = useHeaderHeight();
  const [amount, setAmount] = useState('');
  const [methodId, setMethodId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data && !methodId) setMethodId(data.methods.find((m) => m.isDefault)?.id ?? data.methods[0]?.id ?? '');
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return <Loading />;

  const value = parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const tooLow = value > 0 && value < data.minWithdrawal;
  const tooHigh = value > data.balance;
  const method = data.methods.find((m) => m.id === methodId);
  const quick = [data.minWithdrawal, Math.floor(data.balance / 2), data.balance].filter((v, i, a) => v >= data.minWithdrawal && v <= data.balance && a.indexOf(v) === i);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await api.withdraw(value, methodId);
      if (router.canGoBack()) router.back();
      else router.replace('/wallet');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not request the withdrawal');
      setBusy(false);
    }
  };

  if (!data.methods.length) {
    return (
      <Screen edges={['bottom']}>
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Feather name="credit-card" size={26} color={colors.primary} /></View>
          <Text style={[type.title, { textAlign: 'center' }]}>Where should we send it?</Text>
          <Text style={[type.small, { textAlign: 'center' }]}>
            {isOwner ? 'Add a UPI ID or a bank account first. You only do this once.' : 'Ask your account owner to add a UPI ID or bank account in the Wallet.'}
          </Text>
          {isOwner ? <Button label="Add UPI or bank account" icon="plus" onPress={() => router.push('/payout-method')} style={{ alignSelf: 'stretch', marginTop: space.lg }} /> : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']} keyboardOffset={headerHeight} onRefresh={refresh}>
      <Text style={type.label}>Amount</Text>
      <View style={[styles.amountBox, (tooLow || tooHigh) && { borderColor: colors.danger }]}>
        <Text style={styles.rupee}>₹</Text>
        <TextInput
          value={amount}
          onChangeText={(v) => setAmount(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.faint}
          style={styles.amountInput}
          autoFocus
        />
      </View>
      <Text style={[type.small, { marginTop: 6, color: tooLow || tooHigh ? colors.danger : colors.muted }]}>
        {tooHigh ? `You can withdraw up to ${inr(data.balance)}` : tooLow ? `Minimum withdrawal is ${inr(data.minWithdrawal)}` : `Available ${inr(data.balance)} · minimum ${inr(data.minWithdrawal)}`}
      </Text>
      {quick.length ? (
        <View style={styles.quick}>
          {quick.map((q) => (
            <Pressable key={q} onPress={() => setAmount(String(q))} style={[styles.chip, value === q && styles.chipOn]}>
              <Text style={[styles.chipText, value === q && { color: '#fff' }]}>{q === data.balance ? `All · ${inr(q)}` : inr(q)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={[type.label, { marginTop: space.xl }]}>Send to</Text>
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        {data.methods.map((m) => {
          const on = m.id === methodId;
          return (
            <Pressable key={m.id} onPress={() => setMethodId(m.id)} style={[styles.method, on && styles.methodOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
              <View style={[styles.methodIcon, on && { backgroundColor: colors.primary }]}>
                <Feather name={m.type === 'upi' ? 'smartphone' : 'briefcase'} size={17} color={on ? '#fff' : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { fontWeight: '600' }]} numberOfLines={1}>{m.type === 'upi' ? m.upi : `${m.bankName || 'Bank account'} ••${m.last4}`}</Text>
                <Text style={type.small} numberOfLines={1}>{m.type === 'upi' ? 'UPI' : `${m.holder} · ${m.ifsc}`}</Text>
              </View>
              <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
            </Pressable>
          );
        })}
        {isOwner ? (
          <Pressable onPress={() => router.push('/payout-method')} style={styles.addRow}>
            <Feather name="plus" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Add another UPI ID or bank account</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.note}>
        <Feather name="clock" size={15} color={colors.muted} />
        <Text style={[type.small, { flex: 1 }]}>
          {data.instantPayouts
            ? 'Once approved, the money is sent instantly by UPI or IMPS and usually arrives within minutes.'
            : 'Withdrawals are checked and paid within one working day. You get a notification with the bank reference.'}
        </Text>
      </View>

      {error ? <Text style={[type.small, { color: colors.danger, marginTop: space.md }]}>{error}</Text> : null}
      <Button
        label={value && method ? `Withdraw ${inr(value)}` : 'Withdraw'}
        onPress={submit}
        loading={busy}
        disabled={!value || tooLow || tooHigh || !method}
        style={{ marginTop: space.lg }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  amountBox: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden', marginTop: space.sm, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.lg, paddingHorizontal: space.lg, height: 68 },
  rupee: { fontSize: 28, fontWeight: '700', color: colors.muted, marginRight: 6 },
  amountInput: { flex: 1, minWidth: 0, width: '100%', fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  chip: { paddingHorizontal: 14, height: 34, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.secondaryTint },
  chipOn: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  method: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line },
  methodOn: { borderColor: colors.primary, backgroundColor: '#F4F9FE' },
  methodIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.secondaryTint, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md, paddingHorizontal: space.sm },
  note: { flexDirection: 'row', gap: space.sm, marginTop: space.xl, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface },
  empty: { alignItems: 'center', gap: space.sm, paddingTop: space.xxl },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.secondaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
});
