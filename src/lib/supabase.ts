import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;

// Aceita o formato novo de chave de API (sb_publishable_...) e, como
// alternativa, a chave anon legada. Ambas são públicas por definição.
const chave = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

if (!url || !chave) {
  throw new Error(
    'Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no arquivo .env.local (veja .env.example).',
  );
}

export const supabase = createClient(url, chave);
