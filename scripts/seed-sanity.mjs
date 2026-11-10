// Import initial du contenu (src/data/seed.json + public/img) dans Sanity.
// Usage : renseignez SANITY_PROJECT_ID et SANITY_WRITE_TOKEN dans .env, puis `npm run seed`.
// Relançable sans risque : les documents sont créés seulement s'ils n'existent pas déjà,
// donc les modifications faites par l'équipe dans le Studio ne sont jamais écrasées.
import { createClient } from '@sanity/client';
import { createReadStream, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const { SANITY_PROJECT_ID, SANITY_DATASET = 'production', SANITY_WRITE_TOKEN } = process.env;
if (!SANITY_PROJECT_ID || !SANITY_WRITE_TOKEN) {
  console.error('SANITY_PROJECT_ID et SANITY_WRITE_TOKEN sont requis (voir .env.example).');
  process.exit(1);
}
const client = createClient({ projectId: SANITY_PROJECT_ID, dataset: SANITY_DATASET, token: SANITY_WRITE_TOKEN, apiVersion: '2025-02-19', useCdn: false });
const seed = JSON.parse(readFileSync(join(root, 'src/data/seed.json'), 'utf8'));
const ref = (id) => ({ _type: 'reference', _ref: id });
const slug = (id) => ({ _type: 'slug', current: id });

// heroImage du seed est un chemin local : le champ Sanity attend une image, on ne l'importe pas.
const { heroImage: _hero, ...settings } = seed.settings;
await client.createIfNotExists({ _id: 'siteSettings', _type: 'siteSettings', ...settings, donationUrl: settings.donationUrl || undefined });

for (const [i, c] of seed.categories.entries())
  await client.createIfNotExists({ _id: `category-${c.id}`, _type: 'category', title: c.label, slug: slug(c.id), order: (i + 1) * 10 });

for (const [i, a] of seed.artists.entries())
  await client.createIfNotExists({ _id: `artist-${a.id}`, _type: 'artist', name: a.name, slug: slug(a.id), role: a.role, bio: a.bio, order: (i + 1) * 10 });

for (const l of seed.lots) {
  const _id = `lot-${l.id}`;
  if (await client.getDocument(_id)) { console.log(`= lot ${l.lot} déjà présent`); continue; }
  const file = join(root, 'public', l.image);
  const asset = await client.assets.upload('image', createReadStream(file), { filename: basename(file) });
  await client.create({
    _id, _type: 'lot', lot: l.lot, title: l.title, slug: slug(l.id), rtl: l.rtl,
    artist: ref(`artist-${l.artist}`), category: ref(`category-${l.category}`),
    image: { _type: 'image', asset: ref(asset._id) },
    tech: l.tech, price: l.price || undefined, published: true,
  });
  console.log(`+ lot ${l.lot} · ${l.title}`);
}
console.log('Import terminé.');
