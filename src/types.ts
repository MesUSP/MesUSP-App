// Tipos espelhando o modelo de dados do MesUSP-Backend.

/**
 * Estados de arquivamento/remoção (mesma semântica em conta, mesinha, item e
 * listagem): arquivado some do app mas o dono vê e pode desarquivar; removido
 * some também para o dono (permanece no banco, mas a API nunca o retorna).
 */
export type StatusConta = 'ativa' | 'arquivada' | 'removida';

/**
 * Categoria de conta: define limites (null = sem limite) e funcionalidades.
 * O usuário comum só enxerga a própria categoria; o desenvolvedor vê todas.
 */
export interface Categoria {
  id: string;
  nome: string;
  limite_mesinhas: number | null;
  limite_itens: number | null;
  /**
   * Acesso aos relatórios avançados (comparação com o período anterior,
   * filtros por item/categoria, reposição recomendada e lista de compras).
   * Aqui é só UX: quem barra de verdade é o corpo das RPCs do backend.
   * Opcional para tolerar um backend anterior à migração relatorios_avancados.
   */
  relatorios_avancados?: boolean;
}

export interface Profile {
  id: string;
  nome: string;
  email: string;
  pix_key: string | null;
  status: StatusConta;
  categoria_id: string;
  criado_em: string;
  categorias?: Categoria;
}

/** Linha de admin_listar_usuarios (RPC restrita à categoria desenvolvedor). */
export interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string;
  status: StatusConta;
  categoria_id: string;
  categoria_nome: string;
  mesinhas_no_limite: number;
  itens_no_limite: number;
  criado_em: string;
}

export type TipoMesinha = 'centralizada' | 'descentralizada';

export interface Mesinha {
  id: string;
  proprietario_id: string;
  nome: string;
  tipo: TipoMesinha;
  descricao: string;
  latitude: number | null;
  longitude: number | null;
  ativo: boolean;
  status: 'ativa' | 'arquivada' | 'removida';
  planilha_id: string | null;
  criado_em: string;
}

export interface ConexaoGoogle {
  usuario_id: string;
  email_google: string | null;
  escopo: string;
  conectado_em: string;
}

export interface MesinhaMembro {
  mesinha_id: string;
  usuario_id: string;
  papel: 'proprietario' | 'colaborador';
  status: 'ativo' | 'removido';
  criado_em: string;
  profiles?: Pick<Profile, 'nome' | 'email'>;
}

export interface Item {
  id: string;
  dono_id: string;
  nome: string;
  categoria: string;
  descricao: string;
  foto_url: string | null;
  status: 'ativo' | 'arquivado' | 'removido';
  criado_em: string;
}

export interface Listagem {
  id: string;
  item_id: string;
  mesinha_id: string;
  dono_id: string;
  preco_atual: number;
  estoque_atual: number;
  status: 'ativa' | 'arquivada' | 'removida';
  criado_em: string;
  itens?: Pick<Item, 'nome' | 'categoria' | 'descricao'>;
  mesinhas?: Pick<Mesinha, 'nome' | 'tipo'>;
  profiles?: Pick<Profile, 'nome'>;
}

export interface Preco {
  id: string;
  listagem_id: string;
  preco: number;
  vigente_de: string;
  vigente_ate: string | null;
}

export interface Reposicao {
  id: string;
  listagem_id: string;
  quantidade: number;
  custo_unitario_compra: number;
  /** Quando a reposição foi revertida (null = vigente). */
  revertida_em: string | null;
  data: string;
}

export type StatusPagamento = 'pendente' | 'confirmado';

export interface Venda {
  id: string;
  listagem_id: string;
  quantidade: number;
  preco_unitario: number;
  status_pagamento: StatusPagamento;
  revertida_em: string | null;
  data: string;
}

export interface Perda {
  id: string;
  listagem_id: string;
  quantidade: number;
  motivo: string;
  revertida_em: string | null;
  data: string;
}

export interface CardapioMesinha {
  id: string;
  nome: string;
  tipo: TipoMesinha;
  descricao: string;
  latitude: number | null;
  longitude: number | null;
}

export interface CardapioItem {
  mesinha_id: string;
  listagem_id: string;
  item_nome: string;
  categoria: string;
  item_descricao: string;
  foto_url: string | null;
  preco_atual: number;
  disponivel: boolean;
  vendedor_nome: string;
  vendedor_pix: string | null;
}

/**
 * Linha da RPC relatorio_resumo (relatórios avançados): agregados do período
 * atual e do anterior, para a comparação por setas.
 */
export interface ResumoRelatorio {
  periodo: 'atual' | 'anterior';
  receita: number;
  gastos: number;
  slippage_pagamento: number;
  slippage_perdas: number;
}

/** Linha da RPC lista_compras (relatórios avançados). */
export interface LinhaListaCompras {
  mesinha_id: string;
  mesinha_nome: string;
  item_id: string;
  item_nome: string;
  item_categoria: string;
  estoque_atual: number;
  reposicao_recomendada: number;
}

export interface ReconciliacaoListagem {
  listagem_id: string;
  mesinha_id: string;
  dono_id: string;
  estoque_atual: number;
  total_reposto: number;
  total_vendido: number;
  total_perdido: number;
  vendas_sem_pagamento: number;
}
