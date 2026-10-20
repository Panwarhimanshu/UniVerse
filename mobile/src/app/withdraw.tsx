import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Button, Feather, Field, Loading, Screen } from '../components/ui';
import { SignaturePad } from '../components/onboarding';
import { api } from '../lib/api';
import type { GstEntity, InvoicePreview, Transaction } from '../lib/api';
import { useAccess } from '../lib/auth';
import { errorText } from '../lib/dialog';
import { useApi } from '../lib/hooks';
import { inr, shortDate } from '../lib/format';
import { colors, radius, space, type } from '../theme';

/* Withdraw by picking cleared commission entries; TDS is deducted on the entries withdrawn. "Without GST" goes straight
   to a payout method; "with GST": pick the GST registration, check the tax invoice (one line per entry), sign it, and it
   goes with the request for the UniVerse team to verify. */

type Step = 'form' | 'invoice' | 'sign';
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const isCommission = (t: Transaction) => t.kind === 'commission' && t.gross == null;

export default function Withdraw() {
  const { data, refresh } = useApi(api.wallet);
  const { isOwner } = useAccess();
  const headerHeight = useHeaderHeight();
  const [step, setStep] = useState<Step>('form');
  const [sel, setSel] = useState<string[]>([]);
  const [methodId, setMethodId] = useState('');
  const [mode, setMode] = useState<'plain' | 'gst'>('plain');
  const [entities, setEntities] = useState<GstEntity[]>([]);
  const [entityId, setEntityId] = useState('');
  const [adding, setAdding] = useState(false);
  const [ne, setNe] = useState({ gstin: '', legalName: '', address: '' });
  const [invNo, setInvNo] = useState('');
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [signer, setSigner] = useState('');
  const [sig, setSig] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!data) return;
    if (!methodId) setMethodId(data.methods.find((m) => m.isDefault)?.id ?? data.methods[0]?.id ?? '');
    if (!entities.length && data.gstEntities.length) {
      setEntities(data.gstEntities);
      setEntityId(data.gstEntities.find((g) => g.isDefault)?.id ?? data.gstEntities[0].id);
      setMode('gst');
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.nextInvoiceNumber().then((r) => setInvNo(r.suggestion)).catch(() => {}); }, []);
  if (!data) return <Loading />;

  const available = data.transactions.filter((t) => t.type === 'Credit' && t.entryState === 'available');
  const chosen = available.filter((t) => sel.includes(t.id));
  const G = chosen.reduce((x, t) => x + t.amount, 0);
  const T = Math.round((chosen.filter(isCommission).reduce((x, t) => x + t.amount, 0) * data.tdsRate) / 100);
  const gstAdd = mode === 'gst' ? Math.round(G * data.gstRate) / 100 : 0;
  const payout = G + gstAdd - T;
  const tooLow = chosen.length > 0 && payout < data.minWithdrawal;
  const allOn = available.length > 0 && chosen.length === available.length;
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const ids = chosen.map((t) => t.id);
  const method = data.methods.find((m) => m.id === methodId);
  const done = () => (router.canGoBack() ? router.back() : router.replace('/wallet'));

  const submitPlain = async () => {
    setError('');
    setBusy(true);
    try {
      await api.withdraw(ids, methodId);
      done();
    } catch (e) {
      setError(errorText(e, 'Could not request the withdrawal'));
      setBusy(false);
    }
  };
  const toPreview = async () => {
    setError('');
    if (!entityId) return setError('Choose or add the GST registration to invoice from');
    if (!/^[A-Za-z0-9/-]{1,16}$/.test(invNo.trim())) return setError('Enter your invoice number (up to 16 letters, digits, / or -)');
    setBusy(true);
    try {
      setPreview(await api.invoicePreview({ entryIds: ids, methodId, gstEntityId: entityId, invoiceNumber: invNo.trim() }));
      setStep('invoice');
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const addEntity = async () => {
    setError('');
    const g = ne.gstin.trim().toUpperCase();
    if (!GSTIN_RE.test(g)) return setError('Enter a valid 15-character GSTIN');
    if (!ne.legalName.trim() || ne.address.trim().length < 8) return setError('Enter the legal name and address registered under this GSTIN');
    setBusy(true);
    try {
      const created = await api.addGstEntity({ gstin: g, legalName: ne.legalName.trim(), address: ne.address.trim() });
      setEntities(await api.gstEntities());
      setEntityId(created.id);
      setAdding(false);
      setNe({ gstin: '', legalName: '', address: '' });
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const sign = async () => {
    setError('');
    if (signer.trim().length < 3) return setError('Type your name as the authorised signatory');
    if (!sig) return setError('Draw your signature');
    setBusy(true);
    try {
      await api.withdraw(ids, methodId, { gstEntityId: entityId, invoiceNumber: invNo.trim(), signedName: signer.trim(), signature: sig });
      done();
    } catch (e) { setError(errorText(e)); setBusy(false); }
  };

  if (!data.canWithdraw) {
    return (
      <Screen edges={['bottom']}>
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Feather name="shield" size={26} color={colors.primary} /></View>
          <Text style={[type.title, { textAlign: 'center' }]}>One step before withdrawing</Text>
          <Text style={[type.small, { textAlign: 'center' }]}>{data.withdrawBlock}</Text>
          {isOwner ? <Button label="Open KYC & agreement" onPress={() => router.replace('/kyc')} style={{ alignSelf: 'stretch', marginTop: space.lg }} /> : null}
        </View>
      </Screen>
    );
  }
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

  if (step === 'invoice' && preview) {
    const p = preview;
    return (
      <Screen edges={['bottom']}>
        <Text style={type.title}>Check your tax invoice</Text>
        <Text style={[type.small, { marginBottom: space.lg }]}>Drafted from your details. Confirm it is correct, then sign.</Text>
        <View style={styles.inv}>
          <Text style={[type.label, { color: colors.primary }]}>Tax invoice · {p.number}</Text>
          <Text style={[type.heading, { marginTop: space.sm }]}>{p.supplier.legalName}</Text>
          <Text style={type.small}>{p.supplier.address}{p.supplier.state ? `, ${p.supplier.state}` : ''}</Text>
          <Text style={type.small}>GSTIN {p.supplier.gstin}</Text>
          <View style={styles.invRule} />
          <Text style={type.label}>Bill to</Text>
          <Text style={[type.body, { fontWeight: '600' }]}>{p.recipient.legalName}</Text>
          <Text style={type.small}>GSTIN {p.recipient.gstin || '—'} · Place of supply {p.recipient.state}</Text>
          <View style={styles.invRule} />
          <Text style={type.label}>Student service commissions · SAC {p.sac}</Text>
          {p.lines.map((l, i) => (
            <View key={l.id} style={{ flexDirection: 'row', gap: space.sm, marginTop: 6 }}>
              <Text style={[type.small, { width: 16 }]}>{i + 1}</Text>
              <Text style={[type.small, { flex: 1, color: colors.text }]}>{l.desc} <Text style={{ color: colors.muted }}>({l.sub})</Text></Text>
              <Text style={[type.small, { color: colors.text, fontWeight: '600' }]}>{money(l.amount)}</Text>
            </View>
          ))}
          <View style={styles.invRule} />
          <Line label="Taxable value" value={money(p.amount)} />
          {p.interState ? <Line label={`IGST @ ${p.gstRate}%`} value={money(p.igst)} /> : <>
            <Line label={`CGST @ ${p.gstRate / 2}%`} value={money(p.cgst)} />
            <Line label={`SGST @ ${p.gstRate / 2}%`} value={money(p.sgst)} />
          </>}
          <Line label="Invoice total" value={money(p.amount + p.gst)} />
          <Line label={`Less TDS @ ${p.tdsRate}% (section 393)`} value={`− ${money(p.tds)}`} />
          <View style={styles.invRule} />
          <Line label="You receive" value={money(p.payable)} strong />
          <Text style={[type.small, { marginTop: space.sm }]}>Wallet debited {money(p.amount)} · GST paid on top by UniVerse {money(p.gst)} · to {p.payTo}</Text>
        </View>
        <Button label="Details are correct, sign" onPress={() => { setSigner(''); setSig(''); setStep('sign'); }} style={{ marginTop: space.lg }} />
        <Button label="Edit" variant="ghost" onPress={() => setStep('form')} />
      </Screen>
    );
  }

  if (step === 'sign' && preview) {
    return (
      <Screen edges={['bottom']} keyboardOffset={headerHeight} scrollEnabled={!drawing}>
        <Text style={type.title}>Sign the invoice</Text>
        <Text style={[type.small, { marginBottom: space.lg }]}>
          Invoice {preview.number} from {preview.supplier.legalName} for {money(preview.payable)} payable. It is attached to your withdrawal for our team to verify.
        </Text>
        <Field label="Authorised signatory name" value={signer} onChangeText={setSigner} />
        <SignaturePad onChange={setSig} onActive={setDrawing} />
        {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.md }]}>{error}</Text> : null}
        <Button label="Sign and request withdrawal" onPress={sign} loading={busy} />
        <Button label="Back" variant="ghost" onPress={() => setStep('invoice')} />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']} keyboardOffset={headerHeight} onRefresh={refresh}>
      <Text style={[type.small, { marginTop: space.md }]}>Pick the commission entries to redeem. TDS @{data.tdsRate}% is applied only on the entries you select.</Text>
      <Text style={[type.label, { marginTop: space.lg }]}>Billing</Text>
      <View style={styles.seg}>
        {([['plain', 'Without GST', 'Commission net of TDS'], ['gst', 'With GST', `Invoice + ${data.gstRate}% GST on top`]] as const).map(([k, t, d]) => (
          <Pressable key={k} onPress={() => setMode(k)} style={[styles.segBtn, mode === k && styles.methodOn]} accessibilityRole="radio" accessibilityState={{ checked: mode === k }}>
            <Text style={[type.body, { fontWeight: '700' }]}>{t}</Text>
            <Text style={type.small}>{d}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[type.label, { marginTop: space.xl }]}>Commission entries</Text>
      {available.length ? (
        <View style={styles.entries}>
          <Pressable onPress={() => setSel(allOn ? [] : available.map((t) => t.id))} style={[styles.entry, { backgroundColor: colors.surface }]} accessibilityRole="checkbox" accessibilityState={{ checked: allOn }}>
            <View style={[styles.check, allOn && styles.checkOn]}>{allOn ? <Feather name="check" size={14} color="#fff" /> : chosen.length ? <View style={styles.dash} /> : null}</View>
            <View style={{ flex: 1 }}>
              <Text style={[type.body, { fontWeight: '700' }]}>Select all cleared</Text>
              <Text style={type.small}>{available.length} {available.length === 1 ? 'entry' : 'entries'} · {inr(available.reduce((x, t) => x + t.amount, 0))}</Text>
            </View>
          </Pressable>
          {available.map((t) => {
            const on = sel.includes(t.id);
            const [title, detail] = t.description.split(' · ');
            return (
              <Pressable key={t.id} onPress={() => toggle(t.id)} style={[styles.entry, styles.entrySep, on && { backgroundColor: colors.positiveTint }]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                <View style={[styles.check, on && styles.checkOn]}>{on ? <Feather name="check" size={14} color="#fff" /> : null}</View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { fontWeight: '600' }]} numberOfLines={1}>{title}</Text>
                  <Text style={type.small} numberOfLines={1}>{[detail, shortDate(t.date)].filter(Boolean).join(' · ')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[type.body, { fontWeight: '700' }]}>{inr(t.amount)}</Text>
                  <Text style={type.small}>{isCommission(t) ? `TDS ${inr(Math.round((t.amount * data.tdsRate) / 100))}` : 'No TDS'}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : <Text style={[type.small, { marginTop: space.sm }]}>No cleared commission entries to withdraw yet. Pending entries are still clearing.</Text>}
      <View style={styles.totals}>
        {chosen.length ? (
          <>
            <Line label={`Gross · ${chosen.length} ${chosen.length === 1 ? 'entry' : 'entries'}`} value={inr(G)} />
            <Line label={`TDS (${data.tdsRate}%)`} value={`− ${inr(T)}`} />
            {mode === 'gst' ? <Line label={`GST (${data.gstRate}%)`} value={`+ ${inr(gstAdd)}`} /> : null}
            <Line label="Payout to account" value={inr(payout)} strong />
            {tooLow ? <Text style={[type.small, { color: colors.danger, marginTop: 4 }]}>The minimum payout is {inr(data.minWithdrawal)}. Select more entries.</Text> : null}
          </>
        ) : <Text style={type.small}>Select one or more entries above to build your withdrawal.</Text>}
      </View>

      {mode === 'gst' ? (
        <>
          <Text style={[type.label, { marginTop: space.xl }]}>Invoice from</Text>
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            {entities.map((g) => {
              const on = g.id === entityId;
              return (
                <Pressable key={g.id} onPress={() => setEntityId(g.id)} style={[styles.method, on && styles.methodOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.body, { fontWeight: '600' }]} numberOfLines={1}>{g.legalName}{g.isDefault ? ' · default' : ''}</Text>
                    <Text style={type.small} numberOfLines={1}>GSTIN {g.gstin} · {g.state}</Text>
                  </View>
                  <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
                </Pressable>
              );
            })}
            {isOwner && !adding ? (
              <Pressable onPress={() => setAdding(true)} style={styles.addRow}>
                <Feather name="plus" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>{entities.length ? 'Use another GST registration' : 'Add your GST details'}</Text>
              </Pressable>
            ) : null}
            {adding ? (
              <View style={styles.addBox}>
                <Field label="GSTIN" value={ne.gstin} onChangeText={(v) => setNe({ ...ne, gstin: v.toUpperCase().replace(/\s/g, '') })} autoCapitalize="characters" maxLength={15} />
                <Field label="Legal name" value={ne.legalName} onChangeText={(v) => setNe({ ...ne, legalName: v })} />
                <Field label="Registered address" value={ne.address} onChangeText={(v) => setNe({ ...ne, address: v })} multiline />
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Button label="Cancel" variant="secondary" onPress={() => setAdding(false)} style={{ flex: 1 }} />
                  <Button label="Save" onPress={addEntity} loading={busy} style={{ flex: 1 }} />
                </View>
              </View>
            ) : null}
          </View>
          <View style={{ marginTop: space.lg }}>
            <Field label="Your invoice number" value={invNo} onChangeText={setInvNo} maxLength={16} autoCapitalize="characters" />
            <Text style={[type.small, { marginTop: -10 }]}>From your own invoice series for this GSTIN. Each number can be used once.</Text>
          </View>
        </>
      ) : null}

      <Text style={[type.label, { marginTop: space.xl }]}>{mode === 'gst' ? 'Bank account of this registration' : 'Send to'}</Text>
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
          {mode === 'gst'
            ? 'We verify your invoice and GSTIN, then pay the amount plus GST. You get a notification with the bank reference.'
            : data.instantPayouts
              ? 'Once approved, the money is sent instantly by UPI or IMPS and usually arrives within minutes.'
              : 'Withdrawals are checked and paid within two working days of approval. You get a notification with the bank reference.'}
        </Text>
      </View>

      {error ? <Text style={[type.small, { color: colors.danger, marginTop: space.md }]}>{error}</Text> : null}
      <Button
        label={mode === 'gst' ? 'Build invoice' : chosen.length && method ? `Withdraw ${inr(payout)}` : 'Withdraw'}
        onPress={mode === 'gst' ? toPreview : submitPlain}
        loading={busy}
        disabled={!chosen.length || tooLow || !method}
        style={{ marginTop: space.lg }}
      />
    </Screen>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md, marginTop: 6 }}>
      <Text style={[type.small, { flex: 1 }, strong && { color: colors.positive, fontWeight: '800', fontSize: 15 }]}>{label}</Text>
      <Text style={[type.body, { fontWeight: '600' }, strong && { color: colors.positive, fontWeight: '800' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  entries: { marginTop: space.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  entrySep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  checkOn: { borderColor: colors.positive, backgroundColor: colors.positive },
  dash: { width: 10, height: 2, borderRadius: 1, backgroundColor: colors.positive },
  totals: { marginTop: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.secondaryTint },
  seg: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  segBtn: { flex: 1, gap: 2, padding: space.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line },
  method: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line },
  methodOn: { borderColor: colors.primary, backgroundColor: '#F4F9FE' },
  methodIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.secondaryTint, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md, paddingHorizontal: space.sm },
  addBox: { padding: space.md, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line },
  note: { flexDirection: 'row', gap: space.sm, marginTop: space.xl, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface },
  empty: { alignItems: 'center', gap: space.sm, paddingTop: space.xxl },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.secondaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  inv: { padding: space.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  invRule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: space.md },
});
