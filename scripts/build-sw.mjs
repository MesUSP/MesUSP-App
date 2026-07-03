// Gera o service worker com o Workbox após o build do Vite (RNF-PWA-01).

import { generateSW } from 'workbox-build';

const { count, size, warnings } = await generateSW({
  swDest: 'dist/sw.js',
  globDirectory: 'dist',
  globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
  // Aplicação de página única: navegações caem no index.html.
  navigateFallback: '/index.html',
  skipWaiting: true,
  clientsClaim: true,
  sourcemap: false,
  // Dados do Supabase nunca são servidos do cache: estoque e vendas
  // precisam estar sempre atualizados.
  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
      handler: 'NetworkOnly',
    },
  ],
});

for (const aviso of warnings) console.warn(aviso);
console.log(`Service worker gerado: ${count} arquivos pré-cacheados (${(size / 1024).toFixed(0)} KiB).`);
