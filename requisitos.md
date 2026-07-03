# MesUSP / UniMesinha — Especificação do MVP

**Status:** Recorte para implementação do MVP
**Idioma da aplicação:** Português (pt-BR)

## 1. Visão geral

O **UniMesinha** é uma plataforma web centralizada para controle de itens vendidos em mesinhas universitárias, como cookies, brownies, salgados e bebidas.

O sistema atende centros acadêmicos, grupos de extensão e atléticas, permitindo o controle de:

* estoque;
* vendas;
* receita;
* perdas de itens;
* colaboradores;
* cardápio digital;
* sincronização com Google Planilhas.

*Slippage* é a perda de itens que não se converte em receita, por exemplo devido a roubo, furto ou esquecimento de pagamento.

## 2. Conceitos de domínio

### 2.1 Tipos de mesinha

A plataforma deve suportar dois tipos de mesinha:

* **Centralizada:** uma única pessoa ou instituição controla todos os itens.
* **Descentralizada:** vários colaboradores adicionam e controlam seus próprios itens dentro da mesma mesinha.

Em mesinhas descentralizadas, cada vendedor deve controlar de forma independente o estoque, os preços e as vendas dos próprios itens.

### 2.2 Itens e listagens

Um mesmo produto pode ser vendido em mais de uma mesinha.

Para isso, o sistema deve diferenciar:

* **Item:** definição do produto pertencente a um usuário, como “Brownie do PIH”.
* **Listagem:** presença desse item em uma mesinha específica, com preço, estoque, custo e histórico de vendas próprios.

Os dados devem ser separados por item: cada vendedor só pode acessar e editar informações relacionadas aos seus próprios itens.

### 2.3 Contas, propriedade e colaboração

* Cada usuário possui uma conta.
* Um usuário pode criar mesinhas e itens.
* Cada mesinha possui exatamente um proprietário.
* Proprietários podem adicionar colaboradores.
* Proprietários e colaboradores podem adicionar itens à mesinha.
* Cada usuário possui uma única chave PIX, utilizada para receber pagamentos pelos seus itens.
* O cardápio digital deve exibir apenas os itens da mesinha acessada.

## 3. Atores

* **Proprietário da mesinha:** cria e administra mesinhas, adiciona colaboradores e gerencia a planilha vinculada.
* **Colaborador ou vendedor:** adiciona seus itens às mesinhas para as quais foi convidado e controla seus próprios dados.
* **Consumidor final:** acessa o cardápio digital, visualiza preços e realiza pagamentos por PIX.
* **Sistema:** executa sincronizações, cálculos de receita e controle de perdas.

## 4. Requisitos funcionais

### 4.1 Autenticação e contas

* **RF-AUTH-01** O sistema deve permitir cadastro e login de usuários via Supabase Auth.
* **RF-AUTH-02** Um usuário deve poder criar mesinhas e itens.
* **RF-AUTH-03** Um usuário pode ser proprietário de uma mesinha e colaborador em outra.
* **RF-AUTH-04** Cada usuário deve cadastrar uma única chave PIX para receber pagamentos pelos seus itens.
* **RF-AUTH-05** O login não deve restringir endereços de e-mail ao domínio `@usp.br`.

### 4.2 Mesinhas

* **RF-TABLE-01** O proprietário deve poder criar uma mesinha, informando nome, tipo e localização ou descrição.
* **RF-TABLE-02** O proprietário deve poder editar, desativar ou arquivar uma mesinha.
* **RF-TABLE-03** Uma mesinha deve conter itens por meio de listagens e possuir exatamente um proprietário.
* **RF-TABLE-04** Em uma mesinha centralizada, apenas o proprietário controla os itens.
* **RF-TABLE-05** Em uma mesinha descentralizada, múltiplos colaboradores controlam seus próprios itens de forma independente.

### 4.3 Colaboradores

* **RF-COLLAB-01** O proprietário deve poder convidar colaboradores para uma mesinha.
* **RF-COLLAB-02** Proprietários e colaboradores devem poder adicionar itens à mesinha.
* **RF-COLLAB-03** Cada colaborador deve controlar estoque e vendas dos seus próprios itens.
* **RF-COLLAB-04** O proprietário deve poder remover um colaborador. Ao removê-lo, suas listagens devem sair da mesinha, mas permanecer arquivadas no banco de dados, na planilha associada e na conta do próprio usuário.

### 4.4 Itens e listagens

* **RF-ITEM-01** Um usuário deve poder criar itens com nome, categoria e demais atributos necessários.
* **RF-ITEM-02** Um mesmo item deve poder ser listado em mais de uma mesinha, mantendo preço, estoque, custo e vendas independentes em cada uma.
* **RF-ITEM-03** Os dados devem ser separados por item: um vendedor só pode acessar e editar informações dos próprios itens.

### 4.5 Estoque

* **RF-STOCK-01** O sistema deve permitir adicionar estoque por meio de reposições.
* **RF-STOCK-02** Cada reposição deve registrar seu próprio custo de compra.
* **RF-STOCK-03** O sistema deve manter o histórico de preços de venda.
* **RF-STOCK-04** O sistema deve permitir registrar vendas, reduzindo o estoque correspondente.
* **RF-STOCK-05** O sistema deve permitir registrar perdas de estoque não associadas a uma venda.
* **RF-STOCK-06** O saldo de estoque deve ser reconciliável conforme a fórmula:

```text
estoque atual = reposições − vendas − perdas registradas − slippage
```

### 4.6 Vendas e pagamento

* **RF-SALE-01** O controle de vendas deve ser manual: o vendedor registra item, quantidade, preço no momento da venda e mesinha.
* **RF-SALE-02** O pagamento deve ser realizado pelo PIX do vendedor responsável pelo item.
* **RF-SALE-03** O vendedor deve confirmar manualmente o pagamento das vendas.
* **RF-SALE-04** Vendas sem pagamento confirmado devem ser contabilizadas como *slippage* por esquecimento de pagamento.

### 4.7 Cardápio digital, QR code e impressão

* **RF-MENU-01** O sistema deve gerar um QR code para acesso ao cardápio digital da mesinha.
* **RF-MENU-02** O cardápio digital deve exibir apenas itens ativos da mesinha atual.
* **RF-MENU-03** O sistema deve permitir imprimir o QR code do cardápio.
* **RF-MENU-04** O sistema deve permitir imprimir o cardápio completo em formato físico legível.
* **RF-MENU-05** O sistema deve gerar uma folha A4 imprimível com todos os produtos do usuário, seus preços e o QR code de seu PIX.

### 4.8 Receita e *slippage*

* **RF-REV-01** O sistema deve calcular automaticamente gastos e receita nos períodos diário, semanal e mensal.
* **RF-REV-02** O sistema deve informar o valor perdido por *slippage* em cada período.
* **RF-REV-03** Os relatórios devem respeitar a separação de dados por item: vendedores visualizam dados próprios, enquanto proprietários visualizam dados agregados da mesinha.

### 4.9 Sincronização com Google Planilhas

* **RF-SYNC-01** Os dados de estoque e vendas devem ser sincronizados entre a aplicação e uma planilha do Google.
* **RF-SYNC-02** A planilha deve pertencer ao centro acadêmico, atlética ou organização responsável pela mesinha.
* **RF-SYNC-03** A sincronização deve ser unidirecional: a aplicação é a fonte de verdade e envia dados para a planilha.
* **RF-SYNC-04** A sincronização deve ocorrer em ambiente confiável por meio de Supabase Edge Functions e conta de serviço do Google. As credenciais não podem ser expostas no front-end.
* **RF-SYNC-05** O proprietário deve poder vincular a planilha colando seu link de compartilhamento, sem precisar localizar ou extrair manualmente o ID da URL.
* **RF-SYNC-06** A planilha vinculada deve estar compartilhada como “Qualquer pessoa com o link” com papel de editor. A interface deve orientar o proprietário sobre essa configuração.

## 5. Requisitos não funcionais

### 5.1 Arquitetura

* **RNF-ARCH-01** O front-end deve utilizar React com TypeScript e Vite.
* **RNF-ARCH-02** Não devem ser utilizadas bibliotecas externas de interface, estado, roteamento ou HTTP. Devem ser usados `fetch` nativo, Context do React e recursos próprios do React.
* **RNF-ARCH-03** São permitidas as bibliotecas Workbox, `@supabase/supabase-js` e `qrcode`, esta última exclusivamente para codificação confiável dos QR codes.
* **RNF-ARCH-04** O back-end deve utilizar Supabase, com Postgres, RLS, Supabase Auth e Edge Functions para operações sensíveis.

### 5.2 PWA e responsividade

* **RNF-PWA-01** A aplicação deve ser uma Progressive Web Application utilizando Workbox.
* **RNF-PWA-02** A aplicação deve ser instalável em desktop e dispositivos móveis.
* **RNF-RESP-01** A interface deve funcionar adequadamente em desktops, notebooks e celulares.
* **RNF-UI-01** O visual deve ser moderno e minimalista.

### 5.3 Escalabilidade, segurança e privacidade

* **RNF-SCALE-01** A aplicação deve suportar crescimento no número de mesinhas, itens e usuários sem necessidade de reprojeto.
* **RNF-SEC-01** O Postgres deve utilizar RLS para garantir separação de dados por item e mesinha.
* **RNF-SEC-02** Operações que não podem ser confiadas ao front-end devem ser executadas por funções serverless.
* **RNF-SEC-03** Segredos, chaves de serviço e credenciais nunca devem estar disponíveis no cliente.
* **RNF-PRIV-01** O sistema deve tratar dados pessoais e financeiros de forma compatível com a LGPD.

## 6. Modelo de dados proposto

* **`profiles`**: `id`, `nome`, `email`, `pix_key`, `criado_em`.
* **`mesinhas`**: `id`, `proprietario_id`, `nome`, `tipo`, `descricao`, `latitude`, `longitude`, `ativo`, `arquivada`, `planilha_id`, `criado_em`.
* **`mesinha_membros`**: `mesinha_id`, `usuario_id`, `papel`, `status`, `criado_em`.
* **`itens`**: `id`, `dono_id`, `nome`, `categoria`, `descricao`, `foto_url`.
* **`listagens`**: `id`, `item_id`, `mesinha_id`, `dono_id`, `preco_atual`, `estoque_atual`, `status`, `criado_em`.
* **`precos`**: `listagem_id`, `preco`, `vigente_de`, `vigente_ate`.
* **`reposicoes`**: `listagem_id`, `quantidade`, `custo_unitario_compra`, `data`.
* **`vendas`**: `id`, `listagem_id`, `quantidade`, `preco_unitario`, `status_pagamento`, `data`.
* **`perdas`**: `listagem_id`, `quantidade`, `motivo`, `data`.

### Regras de modelagem

* A chave PIX deve ser única por usuário.
* Uma listagem representa um item em uma mesinha específica.
* Remover um colaborador não deve excluir suas listagens: elas devem ser arquivadas.
* O *slippage* deve ser derivado do estoque consumido, das perdas registradas e das vendas sem pagamento confirmado.
* As políticas de acesso devem considerar `dono_id` e os vínculos em `mesinha_membros`.

## 7. Permissões

| Ação                                             | Proprietário | Colaborador | Consumidor |
| ------------------------------------------------ | -----------: | ----------: | ---------: |
| Criar e editar mesinha                           |          Sim |         Não |        Não |
| Convidar e remover colaboradores                 |          Sim |         Não |        Não |
| Adicionar itens à mesinha                        |          Sim |         Sim |        Não |
| Editar estoque, preço e vendas de item próprio   |          Sim |         Sim |        Não |
| Visualizar receita e *slippage* próprios         |          Sim |         Sim |        Não |
| Visualizar agregados da mesinha                  |          Sim |         Não |        Não |
| Visualizar cardápio e realizar pagamento via PIX |          Sim |         Sim |        Sim |

## 8. Fora de escopo

* Integração automática com gateways ou PSPs de pagamento.
* Emissão fiscal ou integração contábil formal.
* Gestão de entregas ou logística.
* Aplicativo nativo para Android ou iOS.
