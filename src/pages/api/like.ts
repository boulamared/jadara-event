import type { APIRoute } from 'astro';
import { getContent } from '../../lib/content';
import { rateLimited, saveLead } from '../../lib/leads';

export const prerender = false;

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const POST: APIRoute = async ({ request, clientAddress, url }) => {
  // Requêtes venant d'un autre site : refusées.
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== url.host) return json(403, { ok: false, error: 'origin' });

  // Derrière Caddy, l'adresse du visiteur est dans X-Forwarded-For (Caddy l'écrase pour les clients non fiables).
  let ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (ip === 'unknown') { try { ip = clientAddress; } catch { /* indisponible */ } }
  if (rateLimited(ip)) return json(429, { ok: false, error: 'rate' });

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return json(400, { ok: false, error: 'json' }); }

  // Anti-robots : champ piège rempli. On répond "ok" sans rien enregistrer.
  if (str(b.website, 200)) return json(200, { ok: true });

  const action = b.action === 'unlike' ? 'unlike' : 'like';
  const prenom = str(b.prenom, 80), nom = str(b.nom, 80), email = str(b.email, 160).toLowerCase();
  const fields: string[] = [];
  if (!prenom) fields.push('prenom');
  if (!nom) fields.push('nom');
  if (!EMAIL.test(email)) fields.push('email');
  if (b.consent !== true) fields.push('consent');
  if (fields.length) return json(422, { ok: false, error: 'validation', fields });

  const { lots, artists } = await getContent();
  const lot = lots.find((l) => l.id === str(b.lotId, 120));
  if (!lot) return json(404, { ok: false, error: 'lot' });

  try {
    await saveLead({
      date: new Date().toISOString(), action, prenom, nom, email,
      lotId: lot.id, lot: lot.lot, oeuvre: lot.title,
      artiste: artists.find((a) => a.id === lot.artist)?.name ?? '',
      consentement: str(b.consentAt, 40) || new Date().toISOString(),
      visiteur: str(b.visitorId, 64),
    });
  } catch (err) {
    console.error('[like] enregistrement impossible', err);
    return json(502, { ok: false, error: 'storage' });
  }
  return json(200, { ok: true });
};
