import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Empty, ErrorNote, Feather, Header, Loading, Screen } from '../../components/ui';
import { Orbit } from '../../components/Orbit';
import { api } from '../../lib/api';
import type { PayoutMethod, Transaction } from '../../lib/api';
import { confirm, errorText, notify } from '../../lib/dialog';
import { ProfileButton } from '../../components/ProfileButton';
import { HeaderActions } from '../../components/HeaderActions';
import { useApi } from '../../lib/hooks';
import { useAccess } from '../../lib/auth';
import { inr, shortDate } from '../../lib/format';
import { colors, radius, space, type } from '../../theme';

const monthOf = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

export default function Wallet() {
  const { data, error, refreshing, refresh } = useApi(api.wallet);
  const { can, sees, isOwner } = useAccess();
  if (!data && !error) return <Loading />;
  const canWithdraw = !!data && data.balance >= data.minWithdrawal;
  const manage = (m: PayoutMethod) => {
    const label = m.type === 'upi' ? m.upi : `${m.bankName || 'Bank account'} ••${m.last4}`;
    const remove = async () => {
      if (!(await confirm('Remove this payout method?', `${label} will no longer be available for withdrawals.`, 'Remove', true))) return;
      try { await api.removePayoutMethod(m.id); refresh(); } catch (e) { notify('Could not remove', errorText(e)); }
    };
    if (m.isDefault) return remove();
    Alert.alert(label ?? 'Payout method', undefined, [
      { text: 'Make default', onPress: async () => { try { await api.setDefaultPayoutMethod(m.id); refresh(); } catch (e) { notify('Could not update', errorText(e)); } } },
      { text: 'Remove', style: 'destructive', onPress: remove },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // transactions grouped by month, newest first
  const groups: { month: string; items: Transaction[] }[] = [];
  for (const t of data?.transactions ?? []) {
    const m = monthOf(t.date);
    if (groups[groups.length - 1]?.month !== m) groups.push({ month: m, items: [] });
    groups[groups.length - 1].items.push(t);
  }

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} header={<Header left={<ProfileButton />} title="Wallet" right={<HeaderActions />} />}>
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

          {!data.canWithdraw ? (
            <Pressable onPress={isOwner ? () => router.push('/kyc') : undefined} style={styles.block}>
              <Feather name="alert-circle" size={18} color={colors.warning} />
              <Text style={[type.small, { flex: 1, color: colors.text }]}>{data.withdrawBlock}</Text>
              {isOwner ? <Feather name="chevron-right" size={18} color={colors.muted} /> : null}
            </Pressable>
          ) : null}
          <Text style={[type.small, { marginTop: space.md }]}>
            Commission is credited after {data.tdsRate}% TDS. Registered under GST? Withdraw "with GST" and we pay {data.gstRate}% GST on top against your signed invoice.
          </Text>

          <View style={{ marginTop: space.xl }}>
            <View style={styles.sectionHead}>
              <Text style={type.label}>Receive money to</Text>
              {isOwner && data.methods.length < 5 ? (
                <Pressable onPress={() => router.push('/payout-method')} hitSlop={8}><Text style={styles.link}>+ Add</Text></Pressable>
              ) : null}
            </View>
            {data.methods.length ? (
              <View style={styles.card}>
                {data.methods.map((m, i) => (
                  <Pressable key={m.id} onPress={isOwner ? () => manage(m) : undefined} style={({ pressed }) => [styles.tx, i > 0 && styles.sep, pressed && isOwner && { backgroundColor: colors.surface }]}>
                    <View style={[styles.txIcon, { backgroundColor: colors.secondaryTint }]}>
                      <Feather name={m.type === 'upi' ? 'smartphone' : 'briefcase'} size={17} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[type.body, { fontWeight: '600' }]} numberOfLines={1}>{m.type === 'upi' ? m.upi : `${m.bankName || 'Bank account'} ••${m.last4}`}</Text>
                      <Text style={type.small} numberOfLines={1}>{m.type === 'upi' ? 'UPI' : `${m.holder} · ${m.ifsc}`}</Text>
                    </View>
                    {m.isDefault ? <View style={styles.badge}><Text style={styles.badgeText}>Default</Text></View> : null}
                  </Pressable>
                ))}
              </View>
            ) : (
              <Pressable onPress={isOwner ? () => router.push('/payout-method') : undefined} style={styles.addCard}>
                <Feather name="plus-circle" size={18} color={colors.primary} />
                <Text style={[type.small, { flex: 1, color: colors.text }]}>
                  {isOwner ? 'Add a UPI ID or bank account to receive your commission.' : 'Your account owner can add a UPI ID or bank account for withdrawals.'}
                </Text>
              </Pressable>
            )}
          </View>

          {groups.length ? groups.map((g) => (
            <View key={g.month} style={{ marginTop: space.xl }}>
              <Text style={type.label}>{g.month}</Text>
              <View style={styles.card}>
                {g.items.map((t, i) => <TxRow key={t.id} t={t} first={i === 0} tdsRate={data.tdsRate} />)}
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

function TxRow({ t, first, tdsRate }: { t: Transaction; first: boolean; tdsRate: number }) {
  const credit = t.type === 'Credit';
  const rejected = t.status === 'Rejected';
  const [title, detail] = t.description.split(' · ');
  const state = credit
    ? (rejected ? 'Cancelled' : t.status === 'Pending' ? 'Clearing' : t.kind === 'adjustment' ? 'Correction' : 'Credited')
    : (rejected ? (t.payout?.state === 'reversed' ? 'Returned' : 'Failed') : t.status === 'Completed' ? 'Paid' : t.payout?.state === 'processing' ? 'On its way' : 'Requested');
  const stateColor = rejected ? colors.danger : t.status === 'Pending' ? colors.warning : colors.muted;
  const sub = credit
    ? [detail, shortDate(t.date)]
    : [t.method?.label ?? title.replace(/^Withdrawal to /, ''), t.payout?.utr ? `Ref ${t.payout.utr}` : rejected && t.payout?.reason ? t.payout.reason : shortDate(t.date)];
  return (
    <View style={[styles.tx, !first && styles.sep]}>
      <View style={[styles.txIcon, { backgroundColor: rejected ? colors.surface : credit ? colors.positiveTint : colors.accentTint }]}>
        <Feather name={credit ? 'arrow-down-left' : 'arrow-up-right'} size={17} color={rejected ? colors.faint : credit ? colors.positive : colors.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.body, { fontWeight: '600' }]} numberOfLines={1}>{credit ? title : 'Withdrawal'}</Text>
        <Text style={type.small} numberOfLines={1}>{sub.filter(Boolean).join(' · ')}</Text>
        {t.gross != null ? (
          <Text style={type.small}>Gross {inr(t.gross)} · TDS {t.tdsRate ?? tdsRate}% −{inr(t.tds ?? 0)}</Text>
        ) : null}
        {t.invoice ? (
          <Text style={type.small} onPress={() => api.downloadInvoice(t.id, `Invoice ${t.invoice!.number}.pdf`).catch((e) => notify('Could not open', errorText(e)))}>
            Invoice {t.invoice.number} · + GST {inr(t.invoice.gst)} · <Text style={{ color: colors.primary, fontWeight: '700' }}>View</Text>
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: rejected ? colors.faint : credit ? colors.positive : colors.text, textDecorationLine: rejected ? 'line-through' : 'none' }}>
          {credit ? '+' : '−'}{inr(t.amount)}
        </Text>
        {t.invoice ? <Text style={[styles.state, { color: colors.positive }]}>you get {inr(t.invoice.payable)}</Text> : null}
        <Text style={[styles.state, { color: stateColor }]}>{state}</Text>
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
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.secondaryTint },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  addCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm, padding: space.lg, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B9D6F2' },
  hint: { color: 'rgba(255,255,255,0.68)', fontSize: 12, marginTop: space.md },
  card: { marginTop: space.sm, borderRadius: radius.lg + 2, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  tx: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 14 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  txIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  state: { fontSize: 11, fontWeight: '600', color: colors.muted },
  block: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.warningTint },
});
