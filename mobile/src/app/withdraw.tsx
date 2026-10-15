import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Button, Field, Loading, Screen } from '../components/ui';
import { api } from '../lib/api';
import { useApi } from '../lib/hooks';
import { inr } from '../lib/format';
import { colors, radius, space, type } from '../theme';

export default function Withdraw() {
  const { data } = useApi(api.wallet);
  const headerHeight = useHeaderHeight();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!data) return <Loading />;

  const value = parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const tooLow = value > 0 && value < data.minWithdrawal;
  const tooHigh = value > data.balance;

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await api.withdraw(value);
      if (router.canGoBack()) router.back();
      else router.replace('/wallet');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not withdraw');
      setBusy(false);
    }
  };

  if (!data.bankAccount) {
    return (
      <Screen edges={['bottom']}>
        <Text style={[type.heading, { marginBottom: space.sm }]}>Add a bank account first</Text>
        <Text style={[type.small, { marginBottom: space.xl }]}>
          Withdrawals go to the payout bank account on your profile. The account owner can add it from More, then Edit.
        </Text>
        <Button label="Go to my details" onPress={() => router.replace('/profile')} />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']} keyboardOffset={headerHeight}>
      <View style={{ padding: space.lg, borderRadius: radius.md, backgroundColor: colors.surface, marginBottom: space.xl }}>
        <Text style={type.label}>Available</Text>
        <Text style={[type.title, { marginTop: 4 }]}>{inr(data.balance)}</Text>
      </View>

      <Field
        label="Amount (₹)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="number-pad"
        placeholder={`Minimum ₹${data.minWithdrawal}`}
        error={tooLow ? `Minimum withdrawal is ₹${data.minWithdrawal}` : tooHigh ? 'More than your available balance' : undefined}
        autoFocus
      />
      <Text style={[type.small, { marginBottom: space.xl }]}>To {data.bankAccount} · usually lands within 1 working day.</Text>

      {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.md }]}>{error}</Text> : null}
      <Button label={value ? `Withdraw ${inr(value)}` : 'Withdraw'} onPress={submit} loading={busy} disabled={!value || tooLow || tooHigh} />
    </Screen>
  );
}
