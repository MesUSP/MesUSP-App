// Camada de acesso a dados. As políticas de RLS do backend garantem que
// cada consulta só retorna o que o usuário pode ver (RF-ITEM-03, RF-REV-03).

import { supabase } from './supabase';
import type {
  CardapioItem,
  CardapioMesinha,
  ConexaoGoogle,
  Item,
  Listagem,
  Mesinha,
  MesinhaMembro,
  Perda,
  Preco,
  ReconciliacaoListagem,
  Reposicao,
  TipoMesinha,
  Venda,
} from '../types';

function garantir<T>(dados: T | null, erro: { message: string } | null): T {
  if (erro) throw new Error(erro.message);
  if (dados === null) throw new Error('Registro não encontrado.');
  return dados;
}

// --------------------------------------------------------------------------
// Mesinhas
// --------------------------------------------------------------------------

export async function listarMesinhas(): Promise<Mesinha[]> {
  const { data, error } = await supabase
    .from('mesinhas')
    .select('*')
    .order('criado_em', { ascending: false });
  return garantir(data, error) as Mesinha[];
}

export async function obterMesinha(id: string): Promise<Mesinha> {
  const { data, error } = await supabase.from('mesinhas').select('*').eq('id', id).single();
  return garantir(data, error) as Mesinha;
}

export async function criarMesinha(dados: {
  nome: string;
  tipo: TipoMesinha;
  descricao: string;
  proprietario_id: string;
}): Promise<Mesinha> {
  const { data, error } = await supabase.from('mesinhas').insert(dados).select().single();
  return garantir(data, error) as Mesinha;
}

export async function atualizarMesinha(
  id: string,
  dados: Partial<Pick<Mesinha, 'nome' | 'tipo' | 'descricao' | 'ativo' | 'status' | 'planilha_id'>>,
): Promise<void> {
  const { error } = await supabase.from('mesinhas').update(dados).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Soft delete: a mesinha some do app e do proprietário, mas permanece no banco. */
export async function removerMesinha(id: string): Promise<void> {
  const { error } = await supabase.rpc('remover_mesinha', { p_mesinha: id });
  if (error) throw new Error(error.message);
}

// --------------------------------------------------------------------------
// Colaboradores
// --------------------------------------------------------------------------

export async function listarMembros(mesinhaId: string): Promise<MesinhaMembro[]> {
  const { data, error } = await supabase
    .from('mesinha_membros')
    .select('*, profiles(nome, email)')
    .eq('mesinha_id', mesinhaId)
    .eq('status', 'ativo')
    .order('criado_em');
  return garantir(data, error) as MesinhaMembro[];
}

export async function convidarColaborador(mesinhaId: string, email: string): Promise<void> {
  const { error } = await supabase.rpc('convidar_colaborador', {
    p_mesinha: mesinhaId,
    p_email: email,
  });
  if (error) throw new Error(error.message);
}

export async function removerColaborador(mesinhaId: string, usuarioId: string): Promise<void> {
  const { error } = await supabase.rpc('remover_colaborador', {
    p_mesinha: mesinhaId,
    p_usuario: usuarioId,
  });
  if (error) throw new Error(error.message);
}

// --------------------------------------------------------------------------
// Itens e listagens
// --------------------------------------------------------------------------

export async function listarMeusItens(donoId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('itens')
    .select('*')
    .eq('dono_id', donoId)
    .order('nome');
  return garantir(data, error) as Item[];
}

export async function criarItem(dados: {
  dono_id: string;
  nome: string;
  categoria: string;
  descricao: string;
}): Promise<Item> {
  const { data, error } = await supabase.from('itens').insert(dados).select().single();
  return garantir(data, error) as Item;
}

export async function atualizarItem(
  id: string,
  dados: Partial<Pick<Item, 'nome' | 'categoria' | 'descricao' | 'status'>>,
): Promise<void> {
  const { error } = await supabase.from('itens').update(dados).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Arquiva o item e retira as listagens ativas dele das mesinhas. */
export async function arquivarItem(id: string): Promise<void> {
  const { error } = await supabase.rpc('arquivar_item', { p_item: id });
  if (error) throw new Error(error.message);
}

/** Soft delete: o item some do app e do dono, mas permanece no banco. */
export async function removerItem(id: string): Promise<void> {
  const { error } = await supabase.rpc('remover_item', { p_item: id });
  if (error) throw new Error(error.message);
}

export async function listarListagensDaMesinha(mesinhaId: string): Promise<Listagem[]> {
  const { data, error } = await supabase
    .from('listagens')
    .select('*, itens(nome, categoria, descricao), profiles(nome)')
    .eq('mesinha_id', mesinhaId)
    .order('criado_em');
  return garantir(data, error) as Listagem[];
}

export async function obterListagem(id: string): Promise<Listagem> {
  const { data, error } = await supabase
    .from('listagens')
    .select('*, itens(nome, categoria, descricao), mesinhas(nome, tipo), profiles(nome)')
    .eq('id', id)
    .single();
  return garantir(data, error) as Listagem;
}

export async function criarListagem(dados: {
  item_id: string;
  mesinha_id: string;
  dono_id: string;
  preco_atual: number;
}): Promise<void> {
  const { error } = await supabase.from('listagens').insert(dados);
  if (error) {
    if (error.code === '23505') throw new Error('Este item já está listado nesta mesinha.');
    if (error.code === '42501') {
      throw new Error('Você não tem permissão para listar itens nesta mesinha.');
    }
    throw new Error(error.message);
  }
}

export async function atualizarListagem(
  id: string,
  dados: Partial<Pick<Listagem, 'preco_atual' | 'status'>>,
): Promise<void> {
  const { error } = await supabase.from('listagens').update(dados).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function historicoDePrecos(listagemId: string): Promise<Preco[]> {
  const { data, error } = await supabase
    .from('precos')
    .select('*')
    .eq('listagem_id', listagemId)
    .order('vigente_de', { ascending: false });
  return garantir(data, error) as Preco[];
}

// --------------------------------------------------------------------------
// Estoque: reposições, vendas e perdas
// --------------------------------------------------------------------------

export async function listarReposicoes(listagemId: string): Promise<Reposicao[]> {
  const { data, error } = await supabase
    .from('reposicoes')
    .select('*')
    .eq('listagem_id', listagemId)
    .order('data', { ascending: false });
  return garantir(data, error) as Reposicao[];
}

export async function registrarReposicao(dados: {
  listagem_id: string;
  quantidade: number;
  custo_unitario_compra: number;
}): Promise<void> {
  const { error } = await supabase.from('reposicoes').insert(dados);
  if (error) throw new Error(error.message);
}

export async function listarVendas(listagemId: string): Promise<Venda[]> {
  const { data, error } = await supabase
    .from('vendas')
    .select('*')
    .eq('listagem_id', listagemId)
    .order('data', { ascending: false });
  return garantir(data, error) as Venda[];
}

export async function registrarVenda(dados: {
  listagem_id: string;
  quantidade: number;
  preco_unitario: number;
  status_pagamento: 'pendente' | 'confirmado';
}): Promise<void> {
  const { error } = await supabase.from('vendas').insert(dados);
  if (error) {
    if (error.message.includes('estoque_atual_check')) {
      throw new Error('Estoque insuficiente para registrar esta venda.');
    }
    throw new Error(error.message);
  }
}

export async function confirmarPagamento(vendaId: string): Promise<void> {
  const { error } = await supabase
    .from('vendas')
    .update({ status_pagamento: 'confirmado' })
    .eq('id', vendaId);
  if (error) throw new Error(error.message);
}

export async function listarPerdas(listagemId: string): Promise<Perda[]> {
  const { data, error } = await supabase
    .from('perdas')
    .select('*')
    .eq('listagem_id', listagemId)
    .order('data', { ascending: false });
  return garantir(data, error) as Perda[];
}

export async function registrarPerda(dados: {
  listagem_id: string;
  quantidade: number;
  motivo: string;
}): Promise<void> {
  const { error } = await supabase.from('perdas').insert(dados);
  if (error) {
    if (error.message.includes('estoque_atual_check')) {
      throw new Error('A perda informada é maior que o estoque atual.');
    }
    throw new Error(error.message);
  }
}

// Reversões: a movimentação permanece no histórico com revertida_em
// preenchido e o estoque é estornado pelo backend (one-way).

export async function reverterReposicao(id: string): Promise<void> {
  const { error } = await supabase.rpc('reverter_reposicao', { p_reposicao: id });
  if (error) throw new Error(error.message);
}

export async function reverterVenda(id: string): Promise<void> {
  const { error } = await supabase.rpc('reverter_venda', { p_venda: id });
  if (error) throw new Error(error.message);
}

export async function reverterPerda(id: string): Promise<void> {
  const { error } = await supabase.rpc('reverter_perda', { p_perda: id });
  if (error) throw new Error(error.message);
}

export async function reconciliarListagem(listagemId: string): Promise<ReconciliacaoListagem> {
  const { data, error } = await supabase
    .from('reconciliacao_listagens')
    .select('*')
    .eq('listagem_id', listagemId)
    .single();
  return garantir(data, error) as ReconciliacaoListagem;
}

// --------------------------------------------------------------------------
// Relatórios (agregação no cliente sobre linhas visíveis via RLS)
// --------------------------------------------------------------------------

export interface MovimentacoesPeriodo {
  vendas: (Venda & { listagens: { dono_id: string; mesinha_id: string; preco_atual: number } })[];
  reposicoes: (Reposicao & { listagens: { dono_id: string; mesinha_id: string } })[];
  perdas: (Perda & { listagens: { dono_id: string; mesinha_id: string; preco_atual: number } })[];
}

export async function movimentacoesDesde(inicio: Date): Promise<MovimentacoesPeriodo> {
  const iso = inicio.toISOString();
  // Movimentações revertidas ficam fora dos relatórios e do slippage.
  const [vendas, reposicoes, perdas] = await Promise.all([
    supabase
      .from('vendas')
      .select('*, listagens!inner(dono_id, mesinha_id, preco_atual)')
      .gte('data', iso)
      .is('revertida_em', null),
    supabase
      .from('reposicoes')
      .select('*, listagens!inner(dono_id, mesinha_id)')
      .gte('data', iso)
      .is('revertida_em', null),
    supabase
      .from('perdas')
      .select('*, listagens!inner(dono_id, mesinha_id, preco_atual)')
      .gte('data', iso)
      .is('revertida_em', null),
  ]);
  const erro = vendas.error ?? reposicoes.error ?? perdas.error;
  if (erro) throw new Error(erro.message);
  return {
    vendas: (vendas.data ?? []) as MovimentacoesPeriodo['vendas'],
    reposicoes: (reposicoes.data ?? []) as MovimentacoesPeriodo['reposicoes'],
    perdas: (perdas.data ?? []) as MovimentacoesPeriodo['perdas'],
  };
}

// --------------------------------------------------------------------------
// Cardápio público (views acessíveis sem autenticação)
// --------------------------------------------------------------------------

export async function obterCardapio(
  mesinhaId: string,
): Promise<{ mesinha: CardapioMesinha; itens: CardapioItem[] }> {
  const [mesinha, itens] = await Promise.all([
    supabase.from('cardapio_mesinhas').select('*').eq('id', mesinhaId).single(),
    supabase
      .from('cardapio_itens')
      .select('*')
      .eq('mesinha_id', mesinhaId)
      .order('categoria')
      .order('item_nome'),
  ]);
  return {
    mesinha: garantir(mesinha.data, mesinha.error) as CardapioMesinha,
    itens: garantir(itens.data, itens.error) as CardapioItem[],
  };
}

// --------------------------------------------------------------------------
// Sincronização com Google Planilhas
// --------------------------------------------------------------------------

export async function sincronizarPlanilha(mesinhaId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('sync-planilha', {
    body: { mesinha_id: mesinhaId },
  });
  if (error) {
    let detalhe = error.message;
    if ('context' in error && error.context instanceof Response) {
      try {
        const corpo = await error.context.json();
        if (corpo?.erro) detalhe = corpo.erro;
      } catch {
        // mantém a mensagem original
      }
    }
    throw new Error(detalhe);
  }
  if (data?.erro) throw new Error(data.erro);
}

/** Status da conexão Google do usuário atual (sem expor o refresh token). */
export async function obterConexaoGoogle(): Promise<ConexaoGoogle | null> {
  const { data, error } = await supabase
    .from('minha_conexao_google')
    .select('usuario_id, email_google, escopo, conectado_em')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ConexaoGoogle) ?? null;
}

/** Troca o authorization code do Google pelo refresh token (guardado no backend). */
export async function conectarGoogle(code: string, redirectUri: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('google-oauth-conectar', {
    body: { code, redirect_uri: redirectUri },
  });
  if (error) {
    let detalhe = error.message;
    if ('context' in error && error.context instanceof Response) {
      try {
        const corpo = await error.context.json();
        if (corpo?.erro) detalhe = corpo.erro;
      } catch {
        // mantém a mensagem original
      }
    }
    throw new Error(detalhe);
  }
  if (data?.erro) throw new Error(data.erro);
}

/** Access token efêmero (drive.file) para abrir o Google Picker no navegador. */
export async function obterAccessTokenGoogle(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('google-access-token', { body: {} });
  if (error) {
    let detalhe = error.message;
    if ('context' in error && error.context instanceof Response) {
      try {
        const corpo = await error.context.json();
        if (corpo?.erro) detalhe = corpo.erro;
      } catch {
        // mantém a mensagem original
      }
    }
    throw new Error(detalhe);
  }
  if (data?.erro) throw new Error(data.erro);
  return data.access_token as string;
}

/** Revoga a conexão removendo o refresh token guardado (RPC security definer). */
export async function desconectarGoogle(): Promise<void> {
  const { error } = await supabase.rpc('desconectar_google');
  if (error) throw new Error(error.message);
}

// --------------------------------------------------------------------------
// Conta: arquivar e remover (soft delete)
// --------------------------------------------------------------------------

/** Arquiva a conta e tudo que é dela: some do app, mas o dono continua vendo. */
export async function arquivarConta(): Promise<void> {
  const { error } = await supabase.rpc('arquivar_conta');
  if (error) throw new Error(error.message);
}

/** Desarquiva a conta; mesinhas, itens e listagens são desarquivados individualmente. */
export async function desarquivarConta(): Promise<void> {
  const { error } = await supabase.rpc('desarquivar_conta');
  if (error) throw new Error(error.message);
}

/** Remove a conta: some do app e do dono; os dados permanecem no banco. Irreversível. */
export async function removerConta(): Promise<void> {
  const { error } = await supabase.rpc('remover_conta');
  if (error) throw new Error(error.message);
}
