import { defineField, defineType } from 'sanity';

const slug = (source: string) =>
  defineField({
    name: 'slug', title: 'Identifiant', type: 'slug', options: { source, maxLength: 80 },
    description: 'Généré depuis le nom. Ne pas modifier après publication.',
    validation: (r) => r.required(),
  });

const siteSettings = defineType({
  name: 'siteSettings', title: 'Textes de la page', type: 'document',
  fields: [
    defineField({ name: 'heroTitle', title: 'Titre principal', type: 'string', validation: (r) => r.required().max(80) }),
    defineField({ name: 'heroSub', title: 'Sous-titre', type: 'text', rows: 3, validation: (r) => r.max(260) }),
    defineField({ name: 'heroImage', title: 'Photo du haut de page', type: 'image', description: 'Format portrait, fond sombre de préférence : le texte blanc est posé dessus. Laissé vide, la photo par défaut est utilisée.' }),
    defineField({ name: 'dateLabel', title: 'Date et lieu (affichés)', type: 'string', description: 'Ex. 12 décembre 2026 · Campus Mundiapolis' }),
    defineField({ name: 'eventDate', title: 'Date de la vente', type: 'date', description: 'Sert au compte à rebours.', validation: (r) => r.required() }),
    defineField({ name: 'popinEnabled', title: "Afficher la fenêtre d'accueil", type: 'boolean', initialValue: true, description: "S'ouvre une seule fois par visiteur, quelques secondes après l'arrivée sur la page." }),
    defineField({ name: 'popinTitle', title: "Fenêtre d'accueil : titre", type: 'string', validation: (r) => r.max(70) }),
    defineField({ name: 'popinText', title: "Fenêtre d'accueil : texte", type: 'text', rows: 3, description: 'Laissé vide, un texte est généré avec le nombre d’œuvres et d’artistes.', validation: (r) => r.max(280) }),
    defineField({ name: 'donationUrl', title: 'Lien « Faire un don »', type: 'url', description: 'Laissé vide, le bouton mène à la galerie.' }),
  ],
  preview: { prepare: () => ({ title: 'Textes de la page' }) },
});

const category = defineType({
  name: 'category', title: 'Catégorie', type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Nom', type: 'string', validation: (r) => r.required() }),
    slug('title'),
    defineField({ name: 'order', title: "Ordre d'affichage", type: 'number', initialValue: 10 }),
  ],
  orderings: [{ title: 'Ordre', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
});

const artist = defineType({
  name: 'artist', title: 'Artiste ou donateur', type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Nom', type: 'string', validation: (r) => r.required() }),
    slug('name'),
    defineField({ name: 'role', title: 'Rôle', type: 'string', description: 'Ex. Peintre, Sculptrice, Donateur' }),
    defineField({ name: 'bio', title: 'Portrait', type: 'text', rows: 4 }),
    defineField({ name: 'order', title: "Ordre d'affichage", type: 'number', initialValue: 100 }),
  ],
  preview: { select: { title: 'name', subtitle: 'role' } },
});

const lot = defineType({
  name: 'lot', title: 'Œuvre', type: 'document',
  fields: [
    defineField({ name: 'lot', title: 'Numéro de lot', type: 'number', validation: (r) => r.required().integer().positive() }),
    defineField({ name: 'title', title: 'Titre', type: 'string', validation: (r) => r.required() }),
    slug('title'),
    defineField({ name: 'rtl', title: 'Titre en arabe (écriture de droite à gauche)', type: 'boolean', initialValue: false }),
    defineField({ name: 'artist', title: 'Artiste ou donateur', type: 'reference', to: [{ type: 'artist' }], validation: (r) => r.required() }),
    defineField({ name: 'category', title: 'Catégorie', type: 'reference', to: [{ type: 'category' }], validation: (r) => r.required() }),
    defineField({ name: 'image', title: 'Photo', type: 'image', options: { hotspot: true }, validation: (r) => r.required() }),
    defineField({ name: 'tech', title: 'Technique et dimensions', type: 'string' }),
    defineField({ name: 'price', title: 'Prix de départ (affiché tel quel)', type: 'string', description: 'Ex. Prix de départ : 4 590 DH' }),
    defineField({ name: 'published', title: 'En ligne', type: 'boolean', initialValue: true, description: 'Décochez pour retirer l’œuvre du site sans la supprimer.' }),
  ],
  orderings: [{ title: 'Numéro de lot', name: 'lot', by: [{ field: 'lot', direction: 'asc' }] }],
  preview: {
    select: { title: 'title', lot: 'lot', artist: 'artist.name', media: 'image', published: 'published' },
    prepare: ({ title, lot, artist, media, published }) => ({
      title: `Lot ${lot ?? '?'} · ${title ?? ''}`, subtitle: `${artist ?? ''}${published === false ? ' · hors ligne' : ''}`, media,
    }),
  },
});

// Coups de cœur : créés par le site, consultés dans l'onglet « Contacts ». Non modifiables ici.
const lead = defineType({
  name: 'lead', title: 'Contact', type: 'document', readOnly: true,
  fields: [
    defineField({ name: 'date', title: 'Date', type: 'datetime' }),
    defineField({ name: 'prenom', title: 'Prénom', type: 'string' }),
    defineField({ name: 'nom', title: 'Nom', type: 'string' }),
    defineField({ name: 'email', title: 'E-mail', type: 'string' }),
    defineField({ name: 'lot', title: 'Lot', type: 'number' }),
    defineField({ name: 'lotId', title: 'Identifiant du lot', type: 'string' }),
    defineField({ name: 'oeuvre', title: 'Œuvre', type: 'string' }),
    defineField({ name: 'artiste', title: 'Artiste', type: 'string' }),
    defineField({ name: 'consentement', title: 'Consentement donné le', type: 'datetime' }),
    defineField({ name: 'visiteur', title: 'Identifiant du navigateur', type: 'string' }),
  ],
  preview: { select: { prenom: 'prenom', nom: 'nom', oeuvre: 'oeuvre', lot: 'lot' }, prepare: ({ prenom, nom, oeuvre, lot }) => ({ title: `${prenom ?? ''} ${nom ?? ''}`, subtitle: `Lot ${lot ?? '?'} · ${oeuvre ?? ''}` }) },
});

export const schemaTypes = [siteSettings, lot, artist, category, lead];
