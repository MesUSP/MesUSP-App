import { useEffect, useMemo, useState } from 'react';
import {
  listarListagensDaMesinha,
  listarMesinhas,
  listarMeusItens,
  movimentacoesDesde,
  relatorioResumo,
  reposicaoRecomendada,
  type MovimentacoesPeriodo,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Link } from '../router';
import {
  formatarMoeda,
  inicioDoPeriodo,
  ROTULOS_PERIODO,
  type Periodo,
} from '../lib/format';
import type { Item, Listagem, Mesinha, ResumoRelatorio } from '../types';

interface Resumo {
  receita: number;
  gastos: number;
  slippagePagamento: number;
  slippagePerdas: number;
}

const RESUMO_VAZIO: Resumo = { receita: 0, gastos: 0, slippagePagamento: 0, slippagePerdas: 0 };

function acumular(
  movimentacoes: MovimentacoesPeriodo,
  filtro: (listagem: { dono_id: string; mesinha_id: string }) => boolean,
): Resumo {
  const resumo = { ...RESUMO_VAZIO };
  for (const venda of movimentacoes.vendas) {
    if (!filtro(venda.listagens)) continue;
    const valor = venda.quantidade * venda.preco_unitario;
    if (venda.status_pagamento === 'confirmado') {
      resumo.receita += valor;
    } else {
      resumo.slippagePagamento += valor;
    }
  }
  for (const reposicao of movimentacoes.reposicoes) {
    if (!filtro(reposicao.listagens)) continue;
    resumo.gastos += reposicao.quantidade * reposicao.custo_unitario_compra;
  }
  for (const perda of movimentacoes.perdas) {
    if (!filtro(perda.listagens)) continue;
    resumo.slippagePerdas += perda.quantidade * perda.listagens.preco_atual;
  }
  return resumo;
}

function converterResumo(linha: ResumoRelatorio): Resumo {
  return {
    receita: Number(linha.receita),
    gastos: Number(linha.gastos),
    slippagePagamento: Number(linha.slippage_pagamento),
    slippagePerdas: Number(linha.slippage_perdas),
  };
}

/** Item do próprio usuário disponível nos filtros avançados. */
interface OpcaoItem {
  id: string;
  nome: string;
  categoria: string;
}

export function RelatoriosPage() {
  const { sessao, perfil } = useAuth();
  const avancado = perfil?.categorias?.relatorios_avancados === true;
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [mesinhas, setMesinhas] = useState<Mesinha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Fluxo básico: agregação no cliente, como sempre foi.
  const [movimentacoes, setMovimentacoes] = useState<MovimentacoesPeriodo | null>(null);

  // Fluxo avançado: dados para montar os filtros de cada seção.
  const [meusItens, setMeusItens] = useState<Item[] | null>(null);
  const [listagensPorMesinha, setListagensPorMesinha] = useState<Record<string, Listagem[]> | null>(
    null,
  );

  const usuarioId = sessao?.user.id ?? '';
  const mesinhasProprias = useMemo(
    () => (mesinhas ?? []).filter((mesinha) => mesinha.proprietario_id === usuarioId),
    [mesinhas, usuarioId],
  );

  useEffect(() => {
    listarMesinhas()
      .then(setMesinhas)
      .catch((excecao) => setErro(excecao instanceof Error ? excecao.message : String(excecao)));
  }, []);

  useEffect(() => {
    if (!perfil || avancado) return;
    setMovimentacoes(null);
    movimentacoesDesde(inicioDoPeriodo(periodo))
      .then(setMovimentacoes)
      .catch((excecao) => setErro(excecao instanceof Error ? excecao.message : String(excecao)));
  }, [perfil, avancado, periodo]);

  useEffect(() => {
    if (!avancado || !usuarioId) return;
    listarMeusItens(usuarioId)
      .then(setMeusItens)
      .catch((excecao) => setErro(excecao instanceof Error ? excecao.message : String(excecao)));
  }, [avancado, usuarioId]);

  useEffect(() => {
    if (!avancado || mesinhas === null) return;
    Promise.all(
      mesinhasProprias.map((mesinha) =>
        listarListagensDaMesinha(mesinha.id).then((listagens) => [mesinha.id, listagens] as const),
      ),
    )
      .then((pares) => setListagensPorMesinha(Object.fromEntries(pares)))
      .catch((excecao) => setErro(excecao instanceof Error ? excecao.message : String(excecao)));
  }, [avancado, mesinhas, mesinhasProprias]);

  const meusItensAtivos = useMemo<OpcaoItem[]>(
    () =>
      (meusItens ?? [])
        .filter((item) => item.status === 'ativo')
        .map((item) => ({ id: item.id, nome: item.nome, categoria: item.categoria })),
    [meusItens],
  );

  const resumoVendedor = useMemo(
    () =>
      movimentacoes
        ? acumular(movimentacoes, (listagem) => listagem.dono_id === usuarioId)
        : RESUMO_VAZIO,
    [movimentacoes, usuarioId],
  );

  const carregandoBasico = !avancado && (!movimentacoes || mesinhas === null);
  const carregandoAvancado = avancado && (mesinhas === null || meusItens === null);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Relatórios</h1>
          <p className="subtitulo">Receita, gastos e slippage calculados por período.</p>
        </div>
        <div className="abas" style={{ borderBottom: 'none', marginBottom: 0 }}>
          {(Object.keys(ROTULOS_PERIODO) as Periodo[]).map((opcao) => (
            <button
              key={opcao}
              type="button"
              className={periodo === opcao ? 'ativa' : undefined}
              onClick={() => setPeriodo(opcao)}
            >
              {ROTULOS_PERIODO[opcao]}
            </button>
          ))}
        </div>
      </div>

      {erro && <p className="mensagem-erro">{erro}</p>}
      {!erro && (carregandoBasico || carregandoAvancado) && (
        <p className="subtitulo">Carregando…</p>
      )}

      {!avancado && movimentacoes && mesinhas !== null && (
        <>
          <section className="secao" style={{ marginTop: 0 }}>
            <h2>Meus itens</h2>
            <p className="subtitulo">Somente vendas, gastos e perdas dos itens que são seus.</p>
            <PainelResumo resumo={resumoVendedor} />
          </section>

          {mesinhasProprias.map((mesinha) => (
            <section key={mesinha.id} className="secao">
              <h2>Mesinha: {mesinha.nome}</h2>
              <p className="subtitulo">
                Visão agregada de todos os vendedores (visível apenas ao proprietário).
              </p>
              <PainelResumo
                resumo={acumular(
                  movimentacoes,
                  (listagem) => listagem.mesinha_id === mesinha.id,
                )}
              />
            </section>
          ))}
        </>
      )}

      {avancado && mesinhas !== null && meusItens !== null && (
        <>
          <SecaoAvancada
            titulo="Meus itens"
            descricao="Somente vendas, gastos e perdas dos itens que são seus."
            periodo={periodo}
            categorias={[...new Set(meusItensAtivos.map((item) => item.categoria))]}
            itensProprios={meusItensAtivos}
            primeira
          />

          {mesinhasProprias.map((mesinha) => {
            const listagens = (listagensPorMesinha?.[mesinha.id] ?? []).filter(
              (listagem) => listagem.status === 'ativa',
            );
            return (
              <SecaoAvancada
                key={mesinha.id}
                titulo={`Mesinha: ${mesinha.nome}`}
                descricao="Visão agregada de todos os vendedores (visível apenas ao proprietário)."
                periodo={periodo}
                mesinhaId={mesinha.id}
                categorias={[
                  ...new Set(
                    listagens
                      .map((listagem) => listagem.itens?.categoria)
                      .filter((categoria): categoria is string => Boolean(categoria)),
                  ),
                ]}
                itensProprios={listagens
                  .filter((listagem) => listagem.dono_id === usuarioId && listagem.itens)
                  .map((listagem) => ({
                    id: listagem.item_id,
                    nome: listagem.itens?.nome ?? '',
                    categoria: listagem.itens?.categoria ?? '',
                  }))}
              />
            );
          })}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Seção avançada: dados vêm das RPCs restritas (o backend barra as demais
// categorias); filtros por categoria de item e item do próprio usuário.
// ---------------------------------------------------------------------------

function SecaoAvancada({
  titulo,
  descricao,
  periodo,
  mesinhaId,
  categorias,
  itensProprios,
  primeira,
}: {
  titulo: string;
  descricao: string;
  periodo: Periodo;
  mesinhaId?: string;
  categorias: string[];
  itensProprios: OpcaoItem[];
  primeira?: boolean;
}) {
  const [categoriaItem, setCategoriaItem] = useState('');
  const [itemId, setItemId] = useState('');
  const [dados, setDados] = useState<{ atual: Resumo; anterior: Resumo } | null>(null);
  const [reposicao, setReposicao] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const opcoesItem = useMemo(
    () =>
      categoriaItem
        ? itensProprios.filter((item) => item.categoria === categoriaItem)
        : itensProprios,
    [categoriaItem, itensProprios],
  );

  // Se a categoria mudar e o item escolhido sair das opções, volta para "todos".
  useEffect(() => {
    if (itemId && !opcoesItem.some((item) => item.id === itemId)) setItemId('');
  }, [itemId, opcoesItem]);

  // Itens do usuário que sobram com o filtro atual: com exatamente um, a
  // reposição recomendada dele é exibida.
  const itensFiltrados = itemId
    ? opcoesItem.filter((item) => item.id === itemId)
    : opcoesItem;
  const itemUnico = itensFiltrados.length === 1 ? itensFiltrados[0] : null;

  useEffect(() => {
    let ativo = true;
    setDados(null);
    setErro(null);
    relatorioResumo(periodo, {
      mesinhaId,
      categoriaItem: categoriaItem || undefined,
      itemId: itemId || undefined,
    })
      .then(({ atual, anterior }) => {
        if (!ativo) return;
        setDados({ atual: converterResumo(atual), anterior: converterResumo(anterior) });
      })
      .catch((excecao) => {
        if (ativo) setErro(excecao instanceof Error ? excecao.message : String(excecao));
      });
    return () => {
      ativo = false;
    };
  }, [periodo, mesinhaId, categoriaItem, itemId]);

  const itemUnicoId = itemUnico?.id ?? null;
  useEffect(() => {
    setReposicao(null);
    if (!itemUnicoId) return;
    let ativo = true;
    reposicaoRecomendada(itemUnicoId, periodo, mesinhaId)
      .then((valor) => {
        if (ativo) setReposicao(valor);
      })
      .catch(() => {
        if (ativo) setReposicao(null);
      });
    return () => {
      ativo = false;
    };
  }, [itemUnicoId, periodo, mesinhaId]);

  const parametrosLista = new URLSearchParams({ periodo });
  if (mesinhaId) parametrosLista.set('mesinha', mesinhaId);
  if (categoriaItem) parametrosLista.set('categoria', categoriaItem);
  if (itemId) parametrosLista.set('item', itemId);

  const idBase = mesinhaId ?? 'meus-itens';

  return (
    <section className="secao" style={primeira ? { marginTop: 0 } : undefined}>
      <div className="linha-flex">
        <div>
          <h2>{titulo}</h2>
          <p className="subtitulo">{descricao}</p>
        </div>
        <span className="espacador" />
        <Link para={`/lista-compras?${parametrosLista.toString()}`} className="botao botao-secundario">
          Lista de compras
        </Link>
      </div>

      <div className="filtros-relatorio">
        <div className="campo">
          <label htmlFor={`categoria-${idBase}`}>Categoria de item</label>
          <select
            id={`categoria-${idBase}`}
            value={categoriaItem}
            onChange={(e) => setCategoriaItem(e.target.value)}
          >
            <option value="">Todas</option>
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor={`item-${idBase}`}>Item (somente os seus)</label>
          <select
            id={`item-${idBase}`}
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
          >
            <option value="">Todos</option>
            {opcoesItem.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erro && <p className="mensagem-erro">{erro}</p>}
      {!erro && !dados && <p className="subtitulo">Carregando…</p>}
      {dados && (
        <PainelResumo
          resumo={dados.atual}
          anterior={dados.anterior}
          reposicao={
            itemUnico && reposicao !== null
              ? { itemNome: itemUnico.nome, quantidade: reposicao }
              : null
          }
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Painel de indicadores (com setas de comparação quando há período anterior)
// ---------------------------------------------------------------------------

function PainelResumo({
  resumo,
  anterior,
  reposicao,
}: {
  resumo: Resumo;
  anterior?: Resumo | null;
  reposicao?: { itemNome: string; quantidade: number } | null;
}) {
  const slippageTotal = resumo.slippagePagamento + resumo.slippagePerdas;
  const saldo = resumo.receita - resumo.gastos;
  const slippageAnterior = anterior ? anterior.slippagePagamento + anterior.slippagePerdas : null;
  const saldoAnterior = anterior ? anterior.receita - anterior.gastos : null;
  return (
    <div className="grade-indicadores">
      <div className="cartao indicador">
        <div className="rotulo">Receita confirmada</div>
        <div className="valor positivo">
          {formatarMoeda(resumo.receita)}
          {anterior && (
            <Tendencia
              nome="Receita"
              atual={resumo.receita}
              anterior={anterior.receita}
              bomQuandoMaior
            />
          )}
        </div>
      </div>
      <div className="cartao indicador">
        <div className="rotulo">Gastos com reposição</div>
        <div className="valor">
          {formatarMoeda(resumo.gastos)}
          {anterior && (
            <Tendencia
              nome="Gastos"
              atual={resumo.gastos}
              anterior={anterior.gastos}
              bomQuandoMaior={false}
            />
          )}
        </div>
      </div>
      <div className="cartao indicador">
        <div className="rotulo">Saldo</div>
        <div className={`valor ${saldo >= 0 ? 'positivo' : 'negativo'}`}>
          {formatarMoeda(saldo)}
          {saldoAnterior !== null && (
            <Tendencia nome="Saldo" atual={saldo} anterior={saldoAnterior} bomQuandoMaior />
          )}
        </div>
      </div>
      <div className="cartao indicador">
        <div className="rotulo">Slippage</div>
        <div className={`valor ${slippageTotal > 0 ? 'negativo' : ''}`.trim()}>
          {formatarMoeda(slippageTotal)}
          {slippageAnterior !== null && (
            <Tendencia
              nome="Slippage"
              atual={slippageTotal}
              anterior={slippageAnterior}
              bomQuandoMaior={false}
            />
          )}
        </div>
        <p className="subtitulo" style={{ fontSize: '0.78rem', margin: '0.3rem 0 0' }}>
          {formatarMoeda(resumo.slippagePagamento)} em pagamentos não confirmados +{' '}
          {formatarMoeda(resumo.slippagePerdas)} em perdas registradas
        </p>
      </div>
      {reposicao && (
        <div className="cartao indicador">
          <div className="rotulo">Reposição recomendada</div>
          <div className="valor">{reposicao.quantidade} un.</div>
          <p className="subtitulo" style={{ fontSize: '0.78rem', margin: '0.3rem 0 0' }}>
            Sugestão de reposição de {reposicao.itemNome} para o período selecionado.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Seta da tendência ATUAL em relação ao período anterior: aponta para cima
 * quando a métrica está maior agora; verde quando a tendência é favorável ao
 * saldo (ex.: receita subindo, slippage caindo), vermelho quando desfavorável.
 */
function Tendencia({
  nome,
  atual,
  anterior,
  bomQuandoMaior,
}: {
  nome: string;
  atual: number;
  anterior: number;
  bomQuandoMaior: boolean;
}) {
  if (Math.abs(anterior - atual) < 0.005) return null;
  const atualMaior = atual > anterior;
  const boa = atualMaior === bomQuandoMaior;
  const rotulo = `${nome} ${atualMaior ? 'maior' : 'menor'} que no período anterior (antes: ${formatarMoeda(anterior)})`;
  return (
    <span
      className={`tendencia ${boa ? 'tendencia-boa' : 'tendencia-ruim'}`}
      role="img"
      aria-label={rotulo}
      title={rotulo}
    >
      {atualMaior ? '↑' : '↓'}
    </span>
  );
}
