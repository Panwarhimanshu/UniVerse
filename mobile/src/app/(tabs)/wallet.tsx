import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Empty, ErrorNote, Header, List, Loading, Row, Screen, Section } from '../../components/ui';
import { api } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { useAccess } from '../../lib/auth';
import { inr, shortDate } from '../../lib/format';
import { colors, space, type } from '../../theme';

export default function Wallet() {
  const { data, error, refreshing, refresh } = useApi(api.wallet);
  const { can, sees } = useAccess();
  if (!data && !error) return <Loading />;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Header title="Wallet" />
      {error && !data ? <ErrorNote message={error} onRetry={refresh} /> : null}

      {data ? (
        <>
          <View style={{ marginTop: space.xl }}>
            <Text style={type.label}>Available balance</Text>
            <Text style={styles.balance}>{inr(data.balance)}</Text>
          </View>

          <View style={styles.meta}>
            <View style={{ flex: 1 }}>
              <Text style={[type.body, { fontWeight: '600' }]}>{inr(data.pending)}</Text>
              <Text style={type.small}>Pending clearance</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[type.body, { fontWeight: '600' }]}>{inr(data.lifetime)}</Text>
              <Text style={type.small}>Lifetime earnings</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {can('withdraw') ? <Button label="Withdraw" onPress={() => router.push('/withdraw')} style={{ flex: 1 }} disabled={data.balance < data.minWithdrawal} /> : null}
            {sees('commissions') ? <Button label="Commissions" variant="secondary" onPress={() => router.push('/commissions')} style={{ flex: 1 }} /> : null}
          </View>

          <Section title="Transactions">
            {data.transactions.length ? (
              <List>
                {data.transactions.map((t) => (
                  <Row
                    key={t.id}
                    title={t.description}
                    subtitle={`${shortDate(t.date)}${t.status === 'Pending' ? ' · Pending' : t.status === 'Rejected' ? ' · Rejected' : t.type === 'Debit' ? ' · Paid' : ''}`}
                    right={
                      <Text style={{ fontSize: 15, fontWeight: '600', color: t.status === 'Rejected' ? colors.faint : t.type === 'Credit' ? colors.positive : colors.text, textDecorationLine: t.status === 'Rejected' ? 'line-through' : 'none' }}>
                        {t.type === 'Credit' ? '+' : '−'}{inr(t.amount)}
                      </Text>
                    }
                  />
                ))}
              </List>
            ) : (
              <Empty text="No transactions yet. Commissions show up here when a case reaches its payout step." />
            )}
          </Section>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  balance: { fontSize: 40, fontWeight: '700', letterSpacing: -1, color: colors.text, marginTop: space.xs },
  meta: { flexDirection: 'row', gap: space.lg, marginVertical: space.xl },
});
