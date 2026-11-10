import { createHash } from 'node:crypto';
import { appendFile, mkdir } from 'node:fs/promises';
import { createClient } from '@sanity/client';

export interface LeadRow {
  date: string; action: 'like' | 'unlike';
  prenom: string; nom: string; email: string;
  lotId: string; lot: number; oeuvre: string; artiste: string;
  consentement: string; visiteur: string;
}

const env = (k: string): string => (import.meta.env[k] ?? process.env[k] ?? '') as string;

/**
 * Enregistre un coup de cœur dans Sanity (un document par personne et par œuvre),
 * ou le supprime quand le visiteur le retire. Visible dans l'onglet « Contacts » du Studio.
 *
 * L'identifiant commence par "lead." : dans Sanity, un document dont l'identifiant contient
 * un point n'est jamais lisible sans être connecté, même si le reste du contenu est public.
 *
 * Lève une erreur si rien n'a pu être enregistré : l'appelant renvoie alors un échec
 * au visiteur, jamais un faux "merci".
 */
export async function saveLead(row: LeadRow): Promise<void> {
  const projectId = env('SANITY_PROJECT_ID'), token = env('SANITY_WRITE_TOKEN');
  if (!projectId || !token) {
    if (import.meta.env.DEV) {
      // En local sans Sanity : on écrit dans .data/leads.jsonl pour pouvoir tester.
      await mkdir('.data', { recursive: true });
      await appendFile('.data/leads.jsonl', JSON.stringify(row) + '\n');
      return;
    }
    throw new Error('SANITY_PROJECT_ID ou SANITY_WRITE_TOKEN manquant');
  }
  const client = createClient({
    projectId, token, dataset: env('SANITY_DATASET') || 'production',
    apiVersion: '2025-02-19', useCdn: false, timeout: 8000,
  });
  const _id = 'lead.' + createHash('sha256').update(`${row.email}|${row.lotId}`).digest('hex').slice(0, 32);
  if (row.action === 'unlike') { await client.delete(_id); return; }
  const { action: _action, ...fields } = row;
  await client.createOrReplace({ _id, _type: 'lead', ...fields });
}

/** Limite simple par IP (mémoire du processus : au mieux, par instance serverless). */
const hits = new Map<string, number[]>();
export function rateLimited(ip: string, max = 40, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}
