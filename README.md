# MesUSP App

Frontend web do MesUSP, plataforma de controle de estoque, vendas e *slippage* para mesinhas e geladeiras mantidas por centros acadêmicos e grupos de extensão da Universidade de São Paulo.

## Visão geral

Esta aplicação React (Vite + TypeScript) é a interface para as operações diárias do MesUSP. Ela consome os serviços do Supabase mantidos no repositório `MesUSP-Backend`.

Fluxos implementados:

- cadastro, login e perfil com chave PIX única por usuário;
- criação e administração de mesinhas centralizadas e descentralizadas;
- convite e remoção de colaboradores;
- itens e listagens (o mesmo item pode estar em várias mesinhas, com preço e estoque independentes);
- reposições com custo de compra, vendas manuais, perdas e histórico de preços;
- confirmação manual de pagamento — vendas não confirmadas contam como *slippage*;
- relatórios de receita, gastos e *slippage* por dia, semana e mês;
- cardápio digital público com QR code e pagamento via PIX do vendedor;
- impressão do QR code, do cardápio e de uma folha A4 com produtos, preços e QR do PIX;
- sincronização unidirecional com a planilha do Google vinculada à mesinha;
- PWA instalável com service worker gerado pelo Workbox.

Conforme os requisitos de arquitetura, não há bibliotecas externas de interface, estado, roteamento ou HTTP: o roteador, o gerador de QR code (ISO 18004) e o payload PIX (BR Code) são implementados em `src/router.tsx`, `src/lib/qrcode.ts` e `src/lib/pix.ts`. As únicas dependências de runtime são `react`, `react-dom` e `@supabase/supabase-js`; o Workbox é usado apenas no build do service worker.

## Requisitos

- Node.js em versão LTS;
- npm;
- uma instância do backend MesUSP no Supabase.

## Configuração local

Copie o arquivo de exemplo de variáveis de ambiente e preencha as credenciais públicas da sua instância Supabase:

```bash
cp .env.example .env.local
```

```dotenv
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

Nunca exponha no frontend a `service_role key` ou qualquer outro segredo administrativo.

Instale as dependências e inicie o ambiente de desenvolvimento usando os scripts definidos em `package.json`:

```bash
npm install
npm run dev
```

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | ambiente de desenvolvimento com o Vite |
| `npm run build` | checagem de tipos, build de produção e geração do service worker |
| `npm run preview` | serve o build de produção localmente |
| `npm run icons` | regenera os ícones PNG do PWA em `public/icons` |

## Integração com o backend

Alterações no banco, políticas de Row Level Security, funções e dados iniciais pertencem ao `MesUSP-Backend`. O frontend deve acessar apenas as APIs e funções autorizadas pelas políticas do Supabase.

## Contribuição

Crie uma branch curta e descritiva, mantenha os testes e a documentação atualizados e utilize [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/) nas mensagens de commit.

## Autores

MesUSP é desenvolvido por Pedro Bastos Bruno e Eduardo Lima Moraes.
