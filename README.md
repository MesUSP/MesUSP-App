# MesUSP App

Frontend web do MesUSP, plataforma de controle de estoque, vendas e *slippage* para mesinhas e geladeiras mantidas por centros acadêmicos e grupos de extensão da Universidade de São Paulo.

## Visão geral

Esta aplicação React será a interface para as operações diárias do MesUSP. Ela consumirá os serviços do Supabase mantidos no repositório `MesUSP-Backend`.

Entre os fluxos previstos estão:

- cadastro e consulta de produtos;
- entrada, saída e inventário de estoque;
- registro e acompanhamento de vendas;
- apuração de *slippage* e divergências;
- gestão de organizações, pontos de venda e permissões;
- visualização de indicadores operacionais.

## Requisitos

- Node.js em versão LTS;
- npm, pnpm ou Yarn, conforme o gerenciador definido no projeto;
- uma instância do backend MesUSP no Supabase.

## Configuração local

Após a inicialização do projeto React, copie o arquivo de exemplo de variáveis de ambiente e preencha as credenciais públicas da sua instância Supabase:

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

## Integração com o backend

Alterações no banco, políticas de Row Level Security, funções e dados iniciais pertencem ao `MesUSP-Backend`. O frontend deve acessar apenas as APIs e funções autorizadas pelas políticas do Supabase.

## Contribuição

Crie uma branch curta e descritiva, mantenha os testes e a documentação atualizados e utilize [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/) nas mensagens de commit.

## Autores

MesUSP é desenvolvido por Pedro Bastos Bruno e Eduardo Lima Moraes.
