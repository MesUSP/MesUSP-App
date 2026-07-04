# Contexto do desenvolvimento — MesUSP App

Registro das decisões e do estado do projeto ao fim da implementação inicial do MVP
(julho de 2026), para orientar quem continuar o desenvolvimento.
A especificação completa está em [requisitos.md](requisitos.md).

## Estado atual

- **Produção**: <https://mesusp.netlify.app> — site `mesusp` no time **MesUSP**
  do Netlify. **O build roda na máquina, nunca no Netlify**: `npm run deploy`
  builda local e sobe o `dist` pronto (`netlify deploy --prod --dir=dist
  --no-build`). O `netlify.toml` traz `ignore = "/bin/true"` para pular qualquer
  build remoto disparado por Git/UI — ver "Armadilhas conhecidas".
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
- **Build é sempre local; o Netlify nunca builda.** Builds remotos já
  consumiram **240 créditos** durante a integração do OAuth. Deploy: `npm run
  deploy` (= `netlify deploy --prod --dir=dist --no-build`); rascunho com
  `npm run deploy:draft`. Duas travas garantem isso:
  1. `--no-build` na CLI: o Netlify recebe o `dist` pronto e nem builda.
  2. `ignore = "/bin/true"` no `netlify.toml`: se o repo estiver (ou vier a ser)
     ligado ao Netlify, todo build disparado por Git/UI é **pulado** (o comando
     de ignore retorna 0 = "ignore este build"), antes mesmo de rodar `npm run
     build` na nuvem. Se um dia quiser CI de verdade no Netlify, remova essa
     linha — e lembre do custo.
- **Deploy é sensível a `process.env`**: sem `--no-build`, o Netlify rebuilda
  injetando as vars do painel no `process.env`, que o **Vite prioriza sobre o
  `.env.local`**; um valor divergente de `VITE_GOOGLE_CLIENT_ID` no painel já
  causou `Erro 401: invalid_client`. Mantenha painel e `.env.local` iguais
  (`netlify env:list` / `env:set`).
- **Consentimento OAuth do Google em modo *Testing***: só contas adicionadas
  como *test users* conseguem conectar (senão, `Erro 403: access_denied`), e os
  refresh tokens expiram em 7 dias. Como o app usa só escopos não sensíveis
  (`drive.file`, `userinfo.email`), dá para **publicar em produção sem
  verificação do Google** (OAuth consent screen → *Publish app*), o que remove o
  limite de testadores e a expiração semanal.
