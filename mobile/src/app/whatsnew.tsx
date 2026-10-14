import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chips, Empty, ErrorNote, Feather, Loading, Screen } from '../components/ui';
import { api } from '../lib/api';
import { useApi } from '../lib/hooks';
import { longDate } from '../lib/format';
import { colors, radius, space, type } from '../theme';

const isNew = (iso: string) => Date.now() - new Date(`${iso}T00:00:00`).getTime() < 14 * 864e5;

export default function WhatsNew() {
  const content = useApi(api.content);
  const services = useApi(api.services);
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  if (content.error && !content.data) return <ErrorNote message={content.error} onRetry={content.refresh} />;
  if (!content.data || !services.data) return <Loading />;

  const nameOf: Record<string, string> = Object.fromEntries(services.data.map((s) => [s.key, s.name]));
  const all = (content.data.articles ?? []).filter((a) => nameOf[a.service]);
  const keys = [...new Set(all.map((a) => a.service))];
  const list = all.filter((a) => !filter || a.service === filter);

  return (
    <Screen edges={['bottom']} onRefresh={content.refresh} refreshing={content.refreshing}>
      <Text style={type.small}>Guides, rate changes and market notes from our specialist desks. Share them with your students.</Text>
      <View style={{ marginVertical: space.lg }}>
        <Chips options={keys} value={filter} onChange={setFilter} format={(k) => nameOf[k]} />
      </View>

      {list.length ? (
        <View style={{ gap: space.md }}>
          {list.map((a) => {
            const expanded = open === a.id;
            return (
              <Pressable key={a.id} onPress={() => setOpen(expanded ? null : a.id)} style={[styles.card, expanded && { borderColor: colors.accent }]}>
                <View style={styles.meta}>
                  <Text style={styles.tag}>{nameOf[a.service]}</Text>
                  {isNew(a.d) ? <Text style={[styles.tag, styles.newTag]}>New</Text> : null}
                  <Text style={[type.small, { fontSize: 12 }]}>{longDate(`${a.d}T00:00:00`)} · {a.mins} min read</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Text style={[type.heading, { flex: 1, lineHeight: 22 }]}>{a.t}</Text>
                  <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
                </View>
                {a.teaser ? <Text style={type.small}>{a.teaser}</Text> : null}
                {expanded ? (
                  <View style={{ gap: space.md, marginTop: space.sm }}>
                    {a.body.map((p, i) => <Text key={i} style={[type.body, { lineHeight: 23 }]}>{p}</Text>)}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Empty text="No articles yet." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.lg, gap: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
  tag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: colors.accent, backgroundColor: colors.accentTint, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
  newTag: { color: colors.positive, backgroundColor: colors.positiveTint },
});
