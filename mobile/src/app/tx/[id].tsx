import { StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Button, ErrorNote, Loading, Screen } from '../../components/ui';
import { api } from '../../lib/api';
import { errorText, notify } from '../../lib/dialog';
import { useApi } from '../../lib/hooks';
import { shortDate } from '../../lib/format';
import { colors, radius, space, type } from '../../theme';

/* A wallet row opened: a commission shows its TDS and the withdrawal that redeemed it; a withdrawal shows the
   receipt (entries, TDS, UTR) or the signed GST invoice. */

const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ENTRY: Record<string, string> = { clearing: 'Clearing', available: 'Available', in_process: 'In process', redeemed: 'Redeemed', cancelled: 'Cancelled' };

export default function TxScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: d, error, refresh, refreshing } = useApi(() => api.transaction(String(id)), [id]);
  if (!d && !error) return <Loading />;
  if (!d) return <Screen edges={['bottom']}><ErrorNote message={error ?? 'Could not load'} onRetry={refresh} /></Screen>;
  const credit = d.type === 'Credit';
  const status = d.status === 'Completed' ? 'Paid' : d.status === 'Rejected' ? 'Failed' : d.payout?.state === 'processing' ? 'On its way' : 'Requested';

  return (
    <Screen edges={['bottom']} onRefresh={refresh} refreshing={refreshing}>
      <Stack.Screen options={{ title: credit ? 'Commission entry' : d.invoice ? `Invoice ${d.invoice.number}` : 'Payout receipt' }} />
      <Text style={[type.small, { marginTop: space.md }]}>{shortDate(d.date)}{!credit ? ` · ${d.invoice ? `from ${d.invoice.legalName}` : `Receipt ${d.receiptNo}`}` : ''}</Text>
      {credit ? (
        <View style={styles.card}>
          <Text style={[type.body, { fontWeight: '700' }]}>{d.description}</Text>
          <View style={styles.rule} />
          <Row label="Amount credited" value={money(d.amount)} />
          {d.gross != null
            ? <Row label="TDS deducted at credit (older entry)" value={`− ${money(d.tds ?? 0)}`} />
            : <Row label={`TDS @ ${d.tdsRate ?? 2}% when withdrawn`} value={`− ${money(d.tdsOnWithdrawal ?? 0)}`} />}
          <Row label="Status" value={ENTRY[d.entryState ?? ''] ?? d.status} />
          {d.redeemedIn ? <Row label="Withdrawn in" value={`${shortDate(d.redeemedIn.date)} · ${d.redeemedIn.status === 'Completed' ? 'Paid' : d.redeemedIn.status}`} /> : null}
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={type.label}>Entries</Text>
            {(d.lines ?? []).map((l, i) => (
              <View key={l.id} style={styles.line}>
                <Text style={[type.small, { width: 16 }]}>{i + 1}</Text>
                <Text style={[type.small, { flex: 1, color: colors.text }]}>{l.desc} <Text style={{ color: colors.muted }}>({l.sub})</Text></Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[type.small, { color: colors.text, fontWeight: '600' }]}>{money(l.amount)}</Text>
                  {l.tds ? <Text style={type.small}>TDS −{money(l.tds)}</Text> : null}
                </View>
              </View>
            ))}
            <View style={styles.rule} />
            <Row label="Entries withdrawn" value={money(d.amount)} />
            <Row label={`TDS @ ${d.tdsRate ?? 2}% (section 393)`} value={`− ${money(d.tds ?? 0)}`} />
            {d.invoiceDetail ? <Row label={`GST @ ${d.invoiceDetail.gstRate}%`} value={`+ ${money(d.invoice?.gst ?? 0)}`} /> : null}
            <Row label="Paid to you" value={money(d.netPayout ?? d.amount)} strong />
          </View>
          <View style={styles.card}>
            <Row label="Status" value={status} />
            <Row label="To" value={d.method?.label ?? 'your account'} />
            {d.payout?.utr ? <Row label="Bank reference (UTR)" value={d.payout.utr} /> : null}
            {d.payout?.reason ? <Row label="Note" value={d.payout.reason} /> : null}
            {d.invoiceDetail ? <Row label="Signed by" value={`${d.invoiceDetail.signedName}${d.invoiceDetail.verified ? ' · verified' : ' · awaiting verification'}`} /> : null}
          </View>
          {d.invoice ? (
            <Button label="Open signed invoice (PDF)" variant="secondary" icon="file-text" style={{ marginTop: space.lg }}
              onPress={() => api.downloadInvoice(d.id, `Invoice ${d.invoice!.number}.pdf`).catch((e) => notify('Could not open', errorText(e)))} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md, marginTop: 8 }}>
      <Text style={[type.small, { flex: 1 }, strong && { color: colors.positive, fontWeight: '800', fontSize: 15 }]}>{label}</Text>
      <Text style={[type.body, { fontWeight: '600', flexShrink: 1, textAlign: 'right' }, strong && { color: colors.positive, fontWeight: '800' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: space.md },
  line: { flexDirection: 'row', gap: space.sm, marginTop: 8 },
});
