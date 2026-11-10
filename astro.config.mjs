import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Serveur Node autonome (Docker). La page est rendue à la demande avec le contenu Sanity,
// mis en cache 60 s : une publication dans le Studio est en ligne en moins d'une minute,
// sans reconstruire le site.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { host: true },
});
