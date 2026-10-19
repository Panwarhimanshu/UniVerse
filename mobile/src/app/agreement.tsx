import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Button, List, Row, Screen, Section, StatusPill } from '../components/ui';
import { api } from '../lib/api';
import type { AgreementRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { confirm, errorText, notify } from '../lib/dialog';
import { useApi } from '../lib/hooks';
import { longDate } from '../lib/format';
import { colors, radius, space, type } from '../theme';

type Req = 'download' | 'discussion' | 'termination';

const REQ_LABEL: Record<Req, string> = { download: 'Signed copy', discussion: 'Call about the agreement', termination: 'Termination' };
const outcomeText = (r: AgreementRequest) => {
  const what = r.status === 'Open' ? 'Your RM is on it'
    : r.outcome === 'sent' ? 'Signed copy ready to download'
      : r.outcome === 'scheduled' ? (r.meetingAt ? `Call on ${longDate(r.meetingAt)}, ${new Date(r.meetingAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : 'Your RM replied')
        : r.outcome === 'confirmed' ? `Termination confirmed${r.endsOn ? `, ends ${longDate(r.endsOn)}` : ''}`
          : r.outcome === 'retained' ? 'Agreement continues' : 'Handled';
  return `${what}${r.note ? ` · ${r.note}` : ''}`;
};

export default function Agreement() {
  const { agent, refresh } = useAuth();
  const content = useApi(api.content);
  const requests = useApi(api.agreementRequests);
  const [busy, setBusy] = useState<Req | 'file' | null>(null);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  if (!agent) return null;
  const a = agent.agreement;
  const signed = longDate(a.signedAt);
  const party = agent.agency || agent.name;
  const effective = content.data?.settings.commissionEffective ?? 'July 2026';

  const send = async (t: Req) => {
    if (t === 'termination' && !(await confirm('Request termination?', `${agent.rm.name} will call you before anything changes. Payouts up to the termination date are honoured.`, 'Send request', true))) return;
    setBusy(t);
    try {
      await api.agreementRequest(t);
      requests.refresh();
      notify('Request sent', t === 'termination'
        ? `${agent.rm.name} will call you before anything changes.`
        : `${agent.rm.name} will get back to you within one business day.`);
    } catch (e) {
      notify('Could not send', errorText(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={type.label}>Channel partner agreement</Text>
          {a.status === 'Active'
            ? <StatusPill status="Completed" label="Active" />
            : <StatusPill status={a.status === 'Ending' ? 'Pending' : 'On Hold'} label={a.status === 'Ending' ? `Ends ${a.endsOn ? longDate(a.endsOn) : 'soon'}` : 'Ended'} />}
        </View>
        <Text style={[type.heading, { marginTop: space.sm }]}>{party}</Text>
      </View>

      <List>
        <Row title={a.number || 'Not assigned'} subtitle="Agreement number" />
        <Row title={signed} subtitle="Accepted on" />
        <Row title={a.validTill ? longDate(a.validTill) : 'Not set'} subtitle="Valid till" />
        <Row title={a.autoRenew ? 'On' : 'Off'} subtitle="Auto-renewal" />
      </List>

      {!agent.agreementSigned ? (
        <Button label="Sign the new Channel Partner Agreement" icon="edit-3" style={{ marginTop: space.lg }} onPress={() => router.push('/kyc')} />
      ) : null}
      {a.hasFile ? (
        <Button
          label="Download signed agreement"
          icon="download"
          style={{ marginTop: space.lg }}
          loading={busy === 'file'}
          onPress={async () => {
            setBusy('file');
            try { await api.downloadAgreement(a.fileName || 'UniVerse agreement.pdf'); } catch (e) { notify('Could not download', errorText(e)); } finally { setBusy(null); }
          }}
        />
      ) : null}

      <Section title="Ask your RM">
        <View style={{ gap: space.sm }}>
          {!a.hasFile ? <Button label="Request a signed copy" variant="secondary" icon="file-text" onPress={() => send('download')} loading={busy === 'download'} /> : null}
          <Button label="Request a call about the agreement" variant="secondary" icon="phone" onPress={() => send('discussion')} loading={busy === 'discussion'} />
          {a.status === 'Active' ? <Button label="Request termination" variant="ghost" onPress={() => send('termination')} loading={busy === 'termination'} /> : null}
        </View>
      </Section>

      {requests.data?.length ? (
        <Section title="Your requests">
          <List>
            {requests.data.map((r) => (
              <Row key={r.id} title={REQ_LABEL[r.type]} subtitle={outcomeText(r)} right={<StatusPill status={r.status === 'Open' ? 'Pending' : 'Completed'} label={r.status === 'Open' ? 'Open' : 'Done'} />} />
            ))}
          </List>
        </Section>
      ) : null}

      <Section title="Agreement text">
        <View style={styles.doc}>
          <Text style={styles.h}>Channel Partner Agreement</Text>
          <Text style={styles.p}>
            This agreement is made on {signed} between UniVerse Pvt. Ltd., registered in Ahmedabad, Gujarat ("UniVerse"), and {party},
            represented by {agent.name}{agent.city ? `, of ${agent.city}` : ''} (the "Partner").
          </Text>
          <Text style={styles.h5}>1. Scope</Text>
          <Text style={styles.p}>UniVerse appoints the Partner on a non-exclusive basis to refer students for value added services (education loans, GIC, blocked accounts, remittance, forex cards, insurance, OSHC/OVHC, accommodation and international SIM cards) through the UniVerse partner portal and app.</Text>
          <Text style={styles.h5}>2. Commission and payouts</Text>
          <Text style={styles.p}>Commissions follow the structure in force when a case completes (current structure effective {effective}). They are credited to the Partner's wallet on the payout step and can be withdrawn to the Partner's registered bank account.</Text>
          <Text style={styles.h5}>3. Data protection</Text>
          <Text style={styles.p}>Student records submitted by the Partner stay with the Partner's account and are never shared with or shown to another partner. UniVerse processes them only to deliver the referred services, in line with the DPDP Act, 2023.</Text>
          <Text style={styles.h5}>4. Term and termination</Text>
          <Text style={styles.p}>This agreement is valid until {a.validTill ? longDate(a.validTill) : 'the date on record'}{a.autoRenew ? ' and renews each year unless ended' : ''}. Either party may end it with 30 days' written notice. Commissions earned up to that date are settled within 15 working days.</Text>
          <Text style={styles.h5}>5. Governing law</Text>
          <Text style={styles.p}>Indian law applies. Courts in Ahmedabad, Gujarat have exclusive jurisdiction.</Text>
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.lg, marginBottom: space.lg, borderRadius: radius.md, backgroundColor: colors.surface },
  doc: { padding: space.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, gap: space.sm },
  h: { ...type.heading, textAlign: 'center', marginBottom: space.sm },
  h5: { ...type.body, fontWeight: '600', marginTop: space.sm },
  p: { ...type.small, color: colors.text, lineHeight: 20 },
});
