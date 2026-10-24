import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// SITE_URL and BASE_PATH are set automatically by the deploy workflow.
// Locally they fall back to the dev server defaults.
export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !page.includes('/admin/') })],
  build: { inlineStylesheets: 'always' },
  image: { layout: 'constrained', responsiveStyles: true },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
