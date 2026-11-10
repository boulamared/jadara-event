import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes';
import { LeadsTool } from './tools/LeadsTool';

export default defineConfig({
  name: 'default',
  title: 'Vente solidaire Jadara',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list().title('Contenu').items([
          S.listItem().title('Textes de la page').id('siteSettings')
            .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
          S.divider(),
          S.documentTypeListItem('lot').title('Œuvres'),
          S.documentTypeListItem('artist').title('Artistes & donateurs'),
          S.documentTypeListItem('category').title('Catégories'),
        ]),
    }),
  ],
  // Onglet « Contacts » : les coups de cœur reçus, avec export CSV.
  tools: (prev) => [...prev, { name: 'contacts', title: 'Contacts', component: LeadsTool }],
  schema: {
    types: schemaTypes,
    // "Textes de la page" est un document unique : pas de création ni de suppression.
    templates: (t) => t.filter((x) => x.schemaType !== 'siteSettings' && x.schemaType !== 'lead'),
  },
  document: {
    actions: (actions, { schemaType }) =>
      schemaType === 'siteSettings' ? actions.filter((a) => a.action !== 'delete' && a.action !== 'duplicate') : actions,
  },
});
