import { useCallback, useEffect, useMemo, useState } from 'react';
import { useClient } from 'sanity';
import { Box, Button, Card, Container, Flex, Grid, Heading, Spinner, Stack, Text, TextInput } from '@sanity/ui';

interface Lead {
  _id: string; date: string; prenom: string; nom: string; email: string;
  lot: number; oeuvre: string; artiste: string; consentement: string;
}

const QUERY = `*[_type == "lead"] | order(date desc){_id, date, prenom, nom, email, lot, oeuvre, artiste, consentement}`;
const COLS: [keyof Lead, string][] = [
  ['date', 'Date'], ['prenom', 'Prénom'], ['nom', 'Nom'], ['email', 'E-mail'],
  ['lot', 'Lot'], ['oeuvre', 'Œuvre'], ['artiste', 'Artiste'], ['consentement', 'Consentement'],
];
const when = (iso: string) => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '');

/** CSV lisible par Excel (séparateur ; et BOM), sans formule exécutable. */
function toCsv(rows: Lead[]): string {
  const cell = (v: unknown) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  return '﻿' + [COLS.map(([, label]) => cell(label)).join(';'), ...rows.map((r) => COLS.map(([k]) => cell(r[k])).join(';'))].join('\r\n');
}

export function LeadsTool() {
  const client = useClient({ apiVersion: '2025-02-19' });
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    client.fetch<Lead[]>(QUERY).then((r) => { setLeads(r); setError(''); }).catch((e) => setError(e.message));
  }, [client]);

  // Chargement initial, puis mise à jour dès qu'un coup de cœur arrive ou est retiré.
  useEffect(() => {
    load();
    const sub = client.listen('*[_type == "lead"]', {}, { visibility: 'query', includeResult: false }).subscribe({ next: load, error: () => {} });
    return () => sub.unsubscribe();
  }, [client, load]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (leads ?? []).filter((l) => !t || [l.prenom, l.nom, l.email, l.oeuvre, l.artiste, `lot ${l.lot}`].join(' ').toLowerCase().includes(t));
  }, [leads, q]);

  const byLot = useMemo(() => {
    const m = new Map<number, { lot: number; oeuvre: string; artiste: string; n: number }>();
    for (const l of leads ?? []) {
      const e = m.get(l.lot) ?? { lot: l.lot, oeuvre: l.oeuvre, artiste: l.artiste, n: 0 };
      e.n++; m.set(l.lot, e);
    }
    return [...m.values()].sort((a, b) => b.n - a.n || a.lot - b.lot);
  }, [leads]);

  const people = useMemo(() => new Set((leads ?? []).map((l) => l.email)).size, [leads]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([toCsv(shown)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `contacts-vente-solidaire-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (error) return <Box padding={5}><Card tone="critical" padding={4} radius={3}><Text>Impossible de charger les contacts : {error}</Text></Card></Box>;
  if (!leads) return <Flex padding={6} justify="center"><Spinner muted /></Flex>;

  const max = byLot[0]?.n ?? 1;
  return (
    <Box padding={[3, 4, 5]} style={{ overflow: 'auto', height: '100%' }}>
      <Container width={5}>
        <Stack space={5}>
          <Flex align="center" justify="space-between" gap={3} wrap="wrap">
            <Heading as="h1" size={3}>Contacts</Heading>
            <Flex gap={2}>
              <Button text="Actualiser" mode="ghost" onClick={load} />
              <Button text="Exporter en CSV" tone="primary" onClick={download} disabled={!shown.length} />
            </Flex>
          </Flex>

          <Grid columns={[1, 3]} gap={3}>
            {[[leads.length, 'coups de cœur'], [people, 'personnes'], [byLot.length, 'œuvres présélectionnées']].map(([n, label]) => (
              <Card key={label} padding={4} radius={3} border>
                <Stack space={3}><Heading size={4}>{n}</Heading><Text muted size={1}>{label}</Text></Stack>
              </Card>
            ))}
          </Grid>

          {leads.length === 0 ? (
            <Card padding={5} radius={3} border tone="transparent">
              <Stack space={3}>
                <Text weight="medium">Aucun contact pour l'instant.</Text>
                <Text muted size={1}>Chaque coup de cœur laissé sur le site apparaît ici automatiquement, avec les coordonnées de la personne.</Text>
              </Stack>
            </Card>
          ) : (
            <>
              <Stack space={3}>
                <Text weight="medium" size={1} muted>ŒUVRES LES PLUS PRÉSÉLECTIONNÉES</Text>
                {byLot.slice(0, 8).map((e) => (
                  <Flex key={e.lot} align="center" gap={3}>
                    <Box flex={1} style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', background: 'var(--card-border-color)' }}>
                      <div style={{ position: 'absolute', inset: 0, width: `${(e.n / max) * 100}%`, background: '#C19909', opacity: 0.45 }} />
                      <Box padding={3} style={{ position: 'relative' }}><Text size={1} textOverflow="ellipsis">Lot {e.lot} · {e.oeuvre} · {e.artiste}</Text></Box>
                    </Box>
                    <Box style={{ width: 28, textAlign: 'right' }}><Text weight="medium">{e.n}</Text></Box>
                  </Flex>
                ))}
              </Stack>

              <Stack space={3}>
                <TextInput placeholder="Rechercher un nom, un e-mail, une œuvre…" value={q} onChange={(e) => setQ(e.currentTarget.value)} />
                <Card radius={3} border style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                    <thead>
                      <tr>{COLS.slice(0, 7).map(([k, label]) => (
                        <th key={k} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--card-border-color)', whiteSpace: 'nowrap' }}>{label}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {shown.map((l) => (
                        <tr key={l._id}>
                          <td style={td}>{when(l.date)}</td><td style={td}>{l.prenom}</td><td style={td}>{l.nom}</td>
                          <td style={td}><a href={`mailto:${l.email}`}>{l.email}</a></td>
                          <td style={td}>{l.lot}</td><td style={td}>{l.oeuvre}</td><td style={td}>{l.artiste}</td>
                        </tr>
                      ))}
                      {!shown.length && <tr><td style={td} colSpan={7}>Aucun résultat pour « {q} ».</td></tr>}
                    </tbody>
                  </table>
                </Card>
              </Stack>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

const td: React.CSSProperties = { padding: '9px 12px', borderBottom: '1px solid var(--card-border-color)', verticalAlign: 'top' };
