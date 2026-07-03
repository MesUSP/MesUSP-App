// Tipos espelhando o modelo de dados do MesUSP-Backend.

export interface Profile {
  id: string;
  nome: string;
  email: string;
  pix_key: string | null;
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
  arquivada: boolean;
  planilha_id: string | null;
  criado_em: string;
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
  criado_em: string;
}

export interface Listagem {
  id: string;
  item_id: string;
  mesinha_id: string;
  dono_id: string;
  preco_atual: number;
  estoque_atual: number;
  status: 'ativa' | 'arquivada';
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
  data: string;
}

export type StatusPagamento = 'pendente' | 'confirmado';

export interface Venda {
  id: string;
  listagem_id: string;
  quantidade: number;
  preco_unitario: number;
  status_pagamento: StatusPagamento;
  data: string;
}

export interface Perda {
  id: string;
  listagem_id: string;
  quantidade: number;
  motivo: string;
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
