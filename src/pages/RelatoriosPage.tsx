import { useEffect, useMemo, useState } from 'react';
import { listarMesinhas, movimentacoesDesde, type MovimentacoesPeriodo } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  formatarMoeda,
  inicioDoPeriodo,
  ROTULOS_PERIODO,
  type Periodo,
} from '../lib/format';
import type { Mesinha } from '../types';

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

export function RelatoriosPage() {
  const { sessao } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [movimentacoes, setMovimentacoes] = useState<MovimentacoesPeriodo | null>(null);
  const [mesinhas, setMesinhas] = useState<Mesinha[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setMovimentacoes(null);
    Promise.all([movimentacoesDesde(inicioDoPeriodo(periodo)), listarMesinhas()])
      .then(([dados, minhasMesinhas]) => {
        setMovimentacoes(dados);
        setMesinhas(minhasMesinhas);
      })
      .catch((excecao) =>
        setErro(excecao instanceof Error ? excecao.message : String(excecao)),
      );
  }, [periodo]);

  const usuarioId = sessao?.user.id ?? '';
  const mesinhasProprias = useMemo(
    () => mesinhas.filter((mesinha) => mesinha.proprietario_id === usuarioId),
    [mesinhas, usuarioId],
  );

  const resumoVendedor = useMemo(
    () =>
      movimentacoes
        ? acumular(movimentacoes, (listagem) => listagem.dono_id === usuarioId)
        : RESUMO_VAZIO,
    [movimentacoes, usuarioId],
  );

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
      {!movimentacoes && !erro && <p className="subtitulo">Carregando…</p>}

      {movimentacoes && (
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
    </>
  );
}

function PainelResumo({ resumo }: { resumo: Resumo }) {
  const slippageTotal = resumo.slippagePagamento + resumo.slippagePerdas;
  const saldo = resumo.receita - resumo.gastos;
  return (
    <div className="grade-indicadores">
      <div className="cartao indicador">
        <div className="rotulo">Receita confirmada</div>
        <div className="valor positivo">{formatarMoeda(resumo.receita)}</div>
      </div>
      <div className="cartao indicador">
        <div className="rotulo">Gastos com reposição</div>
        <div className="valor">{formatarMoeda(resumo.gastos)}</div>
      </div>
      <div className="cartao indicador">
        <div className="rotulo">Saldo</div>
        <div className={`valor ${saldo >= 0 ? 'positivo' : 'negativo'}`}>
          {formatarMoeda(saldo)}
        </div>
      </div>
      <div className="cartao indicador">
        <div className="rotulo">Slippage</div>
        <div className={`valor ${slippageTotal > 0 ? 'negativo' : ''}`.trim()}>
          {formatarMoeda(slippageTotal)}
        </div>
        <p className="subtitulo" style={{ fontSize: '0.78rem', margin: '0.3rem 0 0' }}>
          {formatarMoeda(resumo.slippagePagamento)} em pagamentos não confirmados +{' '}
          {formatarMoeda(resumo.slippagePerdas)} em perdas registradas
        </p>
      </div>
    </div>
  );
}
