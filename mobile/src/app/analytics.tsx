import { StyleSheet, Text, View } from 'react-native';
import { ErrorNote, Loading, Screen, Section, Stat } from '../components/ui';
import { api } from '../lib/api';
import type { CaseStatus } from '../lib/api';
import { useAccess } from '../lib/auth';
import { inr } from '../lib/format';
import { useApi } from '../lib/hooks';
import { colors, radius, space, type } from '../theme';

/* Same status colours as the website charts, always shown with their label. */
const STATUS_ORDER: CaseStatus[] = ['Completed', 'In Progress', 'Pending', 'On Hold'];
const STATUS_COLOR: Record<CaseStatus, string> = { Completed: '#1E7E39', 'In Progress': '#0A66C2', Pending: '#D97706', 'On Hold': '#B91C1C' };

const monthLabel = (key: string) => new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short' });
const compact = (n: number) => (n >= 1e7 ? `${+(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${+(n / 1e5).toFixed(1)}L` : n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : String(n));

export default function Analytics() {
  const { sees } = useAccess();
  const { data, error, refresh, refreshing } = useApi(api.analytics);
  if (!data) return error ? <ErrorNote message={error} onRetry={refresh} /> : <Loading />;
  const t = data.totals;
  const money = sees('wallet') ? data.money : null;
  const days = t.avgDaysToComplete === null ? '–' : t.avgDaysToComplete < 1 ? '< 1 day' : `${Math.round(t.avgDaysToComplete)}d`;

  return (
    <Screen edges={['bottom']} onRefresh={refresh} refreshing={refreshing}>
      <View style={styles.stats}>
        <Stat label="Cases" value={String(t.cases)} />
        <Stat label="Completed" value={t.completionRate === null ? '–' : `${Math.round(t.completionRate * 100)}%`} />
        <Stat label="Avg. to complete" value={days} />
      </View>
      <View style={[styles.stats, { marginTop: space.sm }]}>
        <Stat label="Students" value={String(t.students)} />
        <Stat label="Docs needed" value={String(t.docsNeeded)} />
        <Stat label="Docs in review" value={String(t.docsInReview)} />
      </View>

      <Section title="Referrals per month">
        <Columns data={data.monthly.map((m) => ({ label: monthLabel(m.month), value: m.count }))} color={colors.accent} format={String} />
        <Text style={[type.small, styles.foot]}>{data.monthly.reduce((n, m) => n + m.count, 0)} cases in the last 6 months</Text>
      </Section>

      {money ? (
        <Section title="Earnings per month">
          <Columns data={money.monthly.map((m) => ({ label: monthLabel(m.month), value: m.amount }))} color={colors.positive} format={(v) => `₹${compact(v)}`} />
          <Text style={[type.small, styles.foot]}>{inr(money.lifetime)} earned in total · {inr(money.pending)} pending</Text>
        </Section>
      ) : null}

      <Section title="Cases by status">
        <StatusStack counts={data.byStatus} />
      </Section>

      <Section title="Cases by service">
        {data.byService.length ? (
          <View style={{ gap: space.md }}>
            {data.byService.map((s) => {
              const max = Math.max(...data.byService.map((x) => x.count));
              return (
                <View key={s.key} accessibilityLabel={`${s.name}: ${s.count}`}>
                  <View style={styles.rankHead}>
                    <Text style={[type.body, { flex: 1 }]} numberOfLines={1}>{s.name}</Text>
                    <Text style={[type.body, { fontWeight: '600' }]}>{s.count}</Text>
                  </View>
                  <View style={styles.track}><View style={[styles.fill, { width: `${(s.count / max) * 100}%` }]} /></View>
                </View>
              );
            })}
          </View>
        ) : <Text style={type.small}>No cases yet. Refer a student to see your mix here.</Text>}
      </Section>
    </Screen>
  );
}

/* Single-series columns, value above each bar, month underneath. */
function Columns({ data, color, format }: { data: { label: string; value: number }[]; color: string; format: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={styles.chart} accessibilityLabel={data.map((d) => `${d.label}: ${format(d.value)}`).join(', ')}>
      {data.map((d, i) => (
        <View key={d.label} style={styles.col}>
          <Text style={[styles.val, i === data.length - 1 && { color: colors.text }]} numberOfLines={1}>{d.value ? format(d.value) : ''}</Text>
          <View style={styles.colTrack}>
            <View style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 3 : 0, backgroundColor: color, borderTopLeftRadius: 4, borderTopRightRadius: 4, opacity: i === data.length - 1 ? 1 : 0.75 }} />
          </View>
          <View style={styles.base} />
          <Text style={styles.axis}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

function StatusStack({ counts }: { counts: Record<CaseStatus, number> }) {
  const total = STATUS_ORDER.reduce((n, k) => n + counts[k], 0);
  return (
    <View>
      <View style={styles.stack}>
        {total ? STATUS_ORDER.filter((k) => counts[k]).map((k) => <View key={k} style={{ flex: counts[k], backgroundColor: STATUS_COLOR[k] }} />)
          : <View style={{ flex: 1, backgroundColor: colors.line }} />}
      </View>
      <View style={{ marginTop: space.md, gap: space.sm }}>
        {STATUS_ORDER.map((k) => (
          <View key={k} style={styles.legend}>
            <View style={[styles.swatch, { backgroundColor: STATUS_COLOR[k] }]} />
            <Text style={[type.body, { flex: 1 }]}>{k}</Text>
            <Text style={[type.body, { fontWeight: '600', minWidth: 28, textAlign: 'right' }]}>{counts[k]}</Text>
            <Text style={[type.small, { minWidth: 40, textAlign: 'right' }]}>{total ? `${Math.round((counts[k] / total) * 100)}%` : '–'}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  foot: { marginTop: space.sm },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 190, paddingTop: space.sm },
  col: { flex: 1, alignItems: 'center', height: '100%' },
  colTrack: { flex: 1, width: '62%', maxWidth: 28, justifyContent: 'flex-end' },
  val: { fontSize: 11, color: colors.muted, fontWeight: '600', marginBottom: 4, height: 15 },
  base: { alignSelf: 'stretch', height: StyleSheet.hairlineWidth, backgroundColor: colors.faint },
  axis: { fontSize: 11, color: colors.muted, marginTop: 6, height: 16 },
  stack: { flexDirection: 'row', height: 14, borderRadius: radius.sm, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  rankHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: 6 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surface, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
});
