# Contexto do desenvolvimento — MesUSP App

Registro das decisões e do estado do projeto ao fim da implementação inicial do MVP
(julho de 2026), para orientar quem continuar o desenvolvimento.
A especificação completa está em [requisitos.md](requisitos.md).

## Estado atual

- **Produção**: <https://mesusp.netlify.app> — site `mesusp` no time **MesUSP**
  do Netlify (deploy manual com `netlify deploy --prod --dir dist`; o
  `netlify.toml` também permite build conectado ao repositório).
- **Backend**: projeto Supabase hosted `pmgyknbxhzofuedtcquj`
  (`https://pmgyknbxhzofuedtcquj.supabase.co`), configurado pelo repositório
  `MesUSP-Backend`.
- **Usuários de teste** (seed): `ana@exemplo.com` (proprietária) e
  `bruno@exemplo.com` (colaborador), senha `senha123`. Cardápio público de
  demonstração: `/cardapio/33333333-3333-3333-3333-333333333333`.

## Variáveis de ambiente

`.env.local` (não versionado — ver `.env.example`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` — chave no formato novo `sb_publishable_...`;
  a chave anon legada é aceita como alternativa via `VITE_SUPABASE_ANON_KEY`.

As mesmas variáveis estão definidas no painel do site no Netlify. São chaves
públicas; a `service_role` nunca entra no frontend.

## Decisões de arquitetura

- **RNF-ARCH-02** (sem bibliotecas externas de UI, estado, roteamento ou HTTP)
  é respeitado com uma exceção autorizada:
  - Roteador próprio em `src/router.tsx` (Context + History API).
  - Estado global só com Context (`src/context/AuthContext.tsx`).
  - **Exceção — QR code**: o codificador ISO 18004 próprio gerava códigos que
    leitores reais não reconheciam (diagnóstico feito com jsQR). Foi
    substituído pela biblioteca `qrcode` (node-qrcode) com aprovação do time;
    `src/lib/qrcode.ts` é só um adaptador que alimenta o componente SVG
    `QrCodeSvg`. **Não reimplementar QR na mão.**
  - **Payload PIX continua próprio** (`src/lib/pix.ts`): validado byte a byte
    contra o vetor de teste do manual BR Code do Bacen (CRC `1D3D`). O nome do
    recebedor é normalizado para maiúsculas sem acentos, o que muda o CRC em
    relação ao exemplo literal do manual — é intencional.
- **PWA**: service worker gerado no build por `scripts/build-sw.mjs`
  (workbox-build). Dados do Supabase são `NetworkOnly` — nunca servidos do
  cache. Ícones PNG gerados por `scripts/gen-icons.mjs` (sem dependências).
- **SPA no Netlify**: `public/_redirects` e `netlify.toml` redirecionam tudo
  para `index.html` — necessário para `/cardapio/:id` e demais rotas.
- **Autorização fica no banco (RLS)**: a camada `src/lib/api.ts` confia nas
  políticas do backend; o frontend não filtra dados por segurança, só por UX.
- **Vínculo com Google Planilhas**: o proprietário cola o link completo de uma
  planilha compartilhada como “Qualquer pessoa com o link → Editor”.
  `src/lib/googleSheets.ts` valida que o link pertence a `docs.google.com`,
  extrai o ID e mantém compatibilidade com IDs já cadastrados. O banco continua
  armazenando somente `mesinhas.planilha_id`, portanto não houve migração.
- **Autenticação do Google continua no backend**: compartilhamento por link não
  torna a API de escrita anônima. A Edge Function usa a conta de serviço global
  do MesUSP, sem expor credenciais ou exigir que o usuário saiba o e-mail dela.

## Fluxo de autenticação

- Cadastro envia `emailRedirectTo = window.location.origin` e, quando a
  confirmação de e-mail está pendente (resposta sem sessão), a UI avisa o
  usuário e volta para a aba de login.
- O texto do link do e-mail depende do **Site URL** configurado no painel do
  Supabase (*Authentication → URL Configuration*): deve ser
  `https://mesusp.netlify.app`, com `http://localhost:5173` nos Redirect URLs
  para desenvolvimento local.

## Armadilhas conhecidas

- **Cache do service worker**: ao testar uma versão nova em aparelho que já
  abriu o site, recarregue a página para o SW atualizado assumir.
- **Máquina de desenvolvimento sem Node**: o ambiente usado no desenvolvimento
  inicial não tinha Node/npm instalados (foi usado um Node portátil). Em uma
  máquina nova: `sudo dnf install nodejs npm`, depois `npm install`.
- O build embute as variáveis `VITE_*` no bundle: depois de trocar `.env.local`
  é preciso rebuildar.
- A sincronização falha com uma orientação específica quando a planilha não
  está compartilhada como editável por qualquer pessoa com o link. A exposição
  do link concede edição a quem o possuir; essa é uma decisão explícita do MVP.
