import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Empty, ErrorNote, Feather, Header, Loading, Screen } from '../../components/ui';
import { Orbit } from '../../components/Orbit';
import { api } from '../../lib/api';
import type { Transaction } from '../../lib/api';
import { ProfileButton } from '../../components/ProfileButton';
import { HeaderActions } from '../../components/HeaderActions';
import { useApi } from '../../lib/hooks';
import { useAccess } from '../../lib/auth';
import { inr, shortDate } from '../../lib/format';
import { colors, radius, space, type } from '../../theme';

const monthOf = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

export default function Wallet() {
  const { data, error, refreshing, refresh } = useApi(api.wallet);
  const { can, sees } = useAccess();
  if (!data && !error) return <Loading />;
  const canWithdraw = !!data && data.balance >= data.minWithdrawal;

  // transactions grouped by month, newest first
  const groups: { month: string; items: Transaction[] }[] = [];
  for (const t of data?.transactions ?? []) {
    const m = monthOf(t.date);
    if (groups[groups.length - 1]?.month !== m) groups.push({ month: m, items: [] });
    groups[groups.length - 1].items.push(t);
  }

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Header left={<ProfileButton />} title="Wallet" right={<HeaderActions />} />
      {error && !data ? <ErrorNote message={error} onRetry={refresh} /> : null}

      {data ? (
        <>
          <View style={styles.hero}>
            <Orbit />
            <Text style={styles.heroLabel}>Available balance</Text>
            <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{inr(data.balance)}</Text>
            <View style={styles.facts}>
              <View>
                <Text style={styles.factLabel}>Pending clearance</Text>
                <Text style={styles.factValue}>{inr(data.pending)}</Text>
              </View>
              <View style={styles.rule} />
              <View>
                <Text style={styles.factLabel}>Earned so far</Text>
                <Text style={styles.factValue}>{inr(data.lifetime)}</Text>
              </View>
            </View>
            <View style={styles.heroActions}>
              {can('withdraw') ? (
                <Pressable
                  onPress={() => router.push('/withdraw')}
                  disabled={!canWithdraw}
                  style={({ pressed }) => [styles.primary, !canWithdraw && { opacity: 0.45 }, pressed && { opacity: 0.85 }]}
                >
                  <Feather name="arrow-up-right" size={16} color={colors.primary} />
                  <Text style={styles.primaryText}>Withdraw</Text>
                </Pressable>
              ) : null}
              {sees('commissions') ? (
                <Pressable onPress={() => router.push('/commissions')} style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.8 }]}>
                  <Feather name="percent" size={15} color="#fff" />
                  <Text style={styles.secondaryText}>Rates</Text>
                </Pressable>
              ) : null}
            </View>
            {can('withdraw') && !canWithdraw ? (
              <Text style={styles.hint}>You can withdraw once your balance reaches {inr(data.minWithdrawal)}.</Text>
            ) : null}
          </View>

          {groups.length ? groups.map((g) => (
            <View key={g.month} style={{ marginTop: space.xl }}>
              <Text style={type.label}>{g.month}</Text>
              <View style={styles.card}>
                {g.items.map((t, i) => <TxRow key={t.id} t={t} first={i === 0} />)}
              </View>
            </View>
          )) : (
            <View style={{ marginTop: space.xl }}>
              <Empty text="No transactions yet. Commissions show up here when a case reaches its payout step." />
            </View>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function TxRow({ t, first }: { t: Transaction; first: boolean }) {
  const credit = t.type === 'Credit';
  const rejected = t.status === 'Rejected';
  const [title, detail] = t.description.split(' · ');
  const state = rejected ? 'Rejected' : t.status === 'Pending' ? (credit ? 'Clearing' : 'Processing') : credit ? 'Credited' : 'Paid';
  const tone = rejected ? colors.faint : credit ? colors.positive : colors.text;
  return (
    <View style={[styles.tx, !first && styles.sep]}>
      <View style={[styles.txIcon, { backgroundColor: rejected ? colors.surface : credit ? colors.positiveTint : colors.accentTint }]}>
        <Feather name={credit ? 'arrow-down-left' : 'arrow-up-right'} size={17} color={rejected ? colors.faint : credit ? colors.positive : colors.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.body, { fontWeight: '600' }]} numberOfLines={1}>{credit ? title : 'Withdrawal'}</Text>
        <Text style={type.small} numberOfLines={1}>{[credit ? detail : title.replace(/^Withdrawal to /, 'To '), shortDate(t.date)].filter(Boolean).join(' · ')}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: tone, textDecorationLine: rejected ? 'line-through' : 'none' }}>
          {credit ? '+' : '−'}{inr(t.amount)}
        </Text>
        <Text style={[styles.state, t.status === 'Pending' && { color: colors.warning }]}>{state}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: space.lg, padding: space.xl, borderRadius: 22, backgroundColor: colors.primary, overflow: 'hidden' },
  heroLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 38, fontWeight: '800', letterSpacing: -1.2, marginTop: 4 },
  facts: { flexDirection: 'row', gap: space.lg, marginTop: space.lg },
  factLabel: { color: 'rgba(255,255,255,0.68)', fontSize: 11, fontWeight: '600' },
  factValue: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2 },
  rule: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.28)' },
  heroActions: { flexDirection: 'row', gap: space.sm, marginTop: space.xl },
  primary: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: '#fff' },
  primaryText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  secondary: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.18)' },
  secondaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  hint: { color: 'rgba(255,255,255,0.68)', fontSize: 12, marginTop: space.md },
  card: { marginTop: space.sm, borderRadius: radius.lg + 2, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  tx: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 14 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  txIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  state: { fontSize: 11, fontWeight: '600', color: colors.muted },
});
