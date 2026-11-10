import { createClient } from '@sanity/client';
import seed from '../data/seed.json';

export interface Settings { eventDate: string; dateLabel: string; heroTitle: string; heroSub: string; donationUrl: string; heroImage: string; popinEnabled: boolean; popinTitle: string; popinText: string }
export interface Category { id: string; label: string }
export interface Artist { id: string; name: string; role: string; bio: string }
export interface Lot {
  id: string; lot: number; category: string; artist: string;
  title: string; rtl: boolean; tech: string; price: string; image: string;
}
export interface Content { settings: Settings; categories: Category[]; artists: Artist[]; lots: Lot[] }

const env = (k: string): string => (import.meta.env[k] ?? process.env[k] ?? '') as string;

const QUERY = `{
  "settings": *[_type == "siteSettings"][0]{eventDate, dateLabel, heroTitle, heroSub, donationUrl, "heroImage": heroImage.asset->url, popinEnabled, popinTitle, popinText},
  "categories": *[_type == "category"] | order(order asc){"id": slug.current, "label": title},
  "artists": *[_type == "artist"] | order(order asc, name asc){"id": slug.current, name, role, bio},
  "lots": *[_type == "lot" && published != false && defined(image.asset)] | order(lot asc){
    "id": slug.current, lot, "category": category->slug.current, "artist": artist->slug.current,
    title, rtl, tech, price, "image": image.asset->url
  }
}`;

async function fromSanity(projectId: string): Promise<Content> {
  const client = createClient({
    projectId,
    dataset: env('SANITY_DATASET') || 'production',
    apiVersion: '2025-02-19',
    useCdn: false,
    perspective: 'published',
  });
  const r = await client.fetch(QUERY);
  return {
    settings: withHero({ ...seed.settings, ...clean(r.settings) }),
    categories: r.categories ?? [],
    artists: (r.artists ?? []).map((a: Artist) => ({ ...a, role: a.role ?? '', bio: a.bio ?? '' })),
    lots: (r.lots ?? [])
      .filter((l: Lot) => l.id && l.category && l.artist)
      .map((l: Lot) => ({
        ...l, rtl: !!l.rtl, tech: l.tech ?? '', price: l.price ?? '',
        image: `${l.image}?w=900&fit=max&auto=format&q=75`,
      })),
  };
}

/** Photo du hero venant de Sanity : servie redimensionnée par leur CDN. */
function withHero(s: Settings): Settings {
  return s.heroImage.startsWith('http') ? { ...s, heroImage: `${s.heroImage}?w=1600&fit=max&auto=format&q=80` } : s;
}

/** Retire les champs vides pour que les valeurs par défaut s'appliquent. */
function clean<T extends object>(o: T | null): Partial<T> {
  return Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v != null && v !== '')) as Partial<T>;
}

let cache: { at: number; data: Content } | null = null;

/** Contenu du site : Sanity si SANITY_PROJECT_ID est défini, sinon le fichier seed local. */
export async function getContent(): Promise<Content> {
  if (cache && Date.now() - cache.at < 60_000) return cache.data;
  const projectId = env('SANITY_PROJECT_ID');
  const data = projectId ? await fromSanity(projectId) : (seed as Content);
  cache = { at: Date.now(), data };
  return data;
}
