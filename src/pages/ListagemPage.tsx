import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  atualizarListagem,
  confirmarPagamento,
  historicoDePrecos,
  listarPerdas,
  listarReposicoes,
  listarVendas,
  obterListagem,
  reconciliarListagem,
  registrarPerda,
  registrarReposicao,
  registrarVenda,
  reverterPerda,
  reverterReposicao,
  reverterVenda,
} from '../lib/api';
import { Link } from '../router';
import { formatarDataHora, formatarMoeda } from '../lib/format';
import type { Listagem, Perda, Preco, ReconciliacaoListagem, Reposicao, Venda } from '../types';

type Aba = 'vendas' | 'reposicoes' | 'perdas' | 'preco';

export function ListagemPage({ id }: { id: string }) {
  const [listagem, setListagem] = useState<Listagem | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [reposicoes, setReposicoes] = useState<Reposicao[]>([]);
  const [perdas, setPerdas] = useState<Perda[]>([]);
  const [precos, setPrecos] = useState<Preco[]>([]);
  const [reconciliacao, setReconciliacao] = useState<ReconciliacaoListagem | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('vendas');

  const carregar = useCallback(async () => {
    try {
      const [dadosListagem, dadosVendas, dadosReposicoes, dadosPerdas, dadosPrecos, dadosRec] =
        await Promise.all([
          obterListagem(id),
          listarVendas(id),
          listarReposicoes(id),
          listarPerdas(id),
          historicoDePrecos(id),
          reconciliarListagem(id),
        ]);
      setListagem(dadosListagem);
      setVendas(dadosVendas);
      setReposicoes(dadosReposicoes);
      setPerdas(dadosPerdas);
      setPrecos(dadosPrecos);
      setReconciliacao(dadosRec);
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao));
    }
  }, [id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (erro && !listagem) return <p className="mensagem-erro">{erro}</p>;
  if (!listagem) return <p className="subtitulo">Carregando…</p>;

  const pendentes = vendas.filter((v) => v.status_pagamento === 'pendente' && !v.revertida_em);
  const valorPendente = pendentes.reduce((soma, v) => soma + v.quantidade * v.preco_unitario, 0);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>{listagem.itens?.nome}</h1>
          <p className="subtitulo">
            Na mesinha <Link para={`/mesinhas/${listagem.mesinha_id}`}>{listagem.mesinhas?.nome}</Link>
          </p>
        </div>
        <div className="linha-flex">
          {listagem.status === 'arquivada' && (
            <span className="etiqueta etiqueta-erro">arquivada</span>
          )}
          <button
            type="button"
            className="botao botao-fantasma botao-pequeno"
            onClick={() =>
              void atualizarListagem(listagem.id, {
                status: listagem.status === 'ativa' ? 'arquivada' : 'ativa',
              }).then(carregar)
            }
          >
            {listagem.status === 'ativa' ? 'Arquivar listagem' : 'Reativar listagem'}
          </button>
        </div>
      </div>

      {erro && <p className="mensagem-erro">{erro}</p>}

      <div className="grade-indicadores" style={{ marginBottom: '1.25rem' }}>
        <Indicador rotulo="Estoque atual" valor={String(listagem.estoque_atual)} />
        <Indicador rotulo="Preço atual" valor={formatarMoeda(listagem.preco_atual)} />
        <Indicador
          rotulo="Pagamentos pendentes"
          valor={formatarMoeda(valorPendente)}
          classe={valorPendente > 0 ? 'negativo' : undefined}
        />
        {reconciliacao && (
          <Indicador
            rotulo="Reconciliação"
            valor={`${reconciliacao.total_reposto} − ${reconciliacao.total_vendido} − ${reconciliacao.total_perdido} = ${listagem.estoque_atual}`}
          />
        )}
      </div>

      <div className="abas" role="tablist">
        {(
          [
            ['vendas', `Vendas (${vendas.length})`],
            ['reposicoes', `Reposições (${reposicoes.length})`],
            ['perdas', `Perdas (${perdas.length})`],
            ['preco', 'Preço'],
          ] as [Aba, string][]
        ).map(([chave, rotulo]) => (
          <button
            key={chave}
            type="button"
            role="tab"
            aria-selected={aba === chave}
            className={aba === chave ? 'ativa' : undefined}
            onClick={() => setAba(chave)}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === 'vendas' && (
        <AbaVendas listagem={listagem} vendas={vendas} aoAtualizar={carregar} />
      )}
      {aba === 'reposicoes' && (
        <AbaReposicoes listagem={listagem} reposicoes={reposicoes} aoAtualizar={carregar} />
      )}
      {aba === 'perdas' && <AbaPerdas listagem={listagem} perdas={perdas} aoAtualizar={carregar} />}
      {aba === 'preco' && <AbaPreco listagem={listagem} precos={precos} aoAtualizar={carregar} />}
    </>
  );
}

function Indicador({ rotulo, valor, classe }: { rotulo: string; valor: string; classe?: string }) {
  return (
    <div className="cartao indicador">
      <div className="rotulo">{rotulo}</div>
      <div className={`valor ${classe ?? ''}`.trim()}>{valor}</div>
    </div>
  );
}

function Formulario({
  aoEnviar,
  ocupado,
  rotuloBotao,
  children,
  erro,
}: {
  aoEnviar: (evento: FormEvent) => void;
  ocupado: boolean;
  rotuloBotao: string;
  children: ReactNode;
  erro: string | null;
}) {
  return (
    <form className="formulario" onSubmit={aoEnviar}>
      <div className="formulario-linha">{children}</div>
      {erro && <p className="mensagem-erro">{erro}</p>}
      <div>
        <button type="submit" className="botao" disabled={ocupado}>
          {ocupado ? 'Registrando…' : rotuloBotao}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Vendas (RF-SALE-01/03/04)
// ---------------------------------------------------------------------------

function AbaVendas({
  listagem,
  vendas,
  aoAtualizar,
}: {
  listagem: Listagem;
  vendas: Venda[];
  aoAtualizar: () => Promise<void>;
}) {
  const [quantidade, setQuantidade] = useState('1');
  const [preco, setPreco] = useState(String(listagem.preco_atual));
  const [pagamentoRecebido, setPagamentoRecebido] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroReversao, setErroReversao] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function aoReverter(venda: Venda) {
    if (!window.confirm('Reverter esta venda? O estoque será devolvido e ela sairá dos relatórios.')) {
      return;
    }
    setErroReversao(null);
    try {
      await reverterVenda(venda.id);
      await aoAtualizar();
    } catch (excecao) {
      setErroReversao(excecao instanceof Error ? excecao.message : String(excecao));
    }
  }

  async function aoRegistrar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      await registrarVenda({
        listagem_id: listagem.id,
        quantidade: Number(quantidade),
        preco_unitario: Number(preco),
        status_pagamento: pagamentoRecebido ? 'confirmado' : 'pendente',
      });
      setQuantidade('1');
      await aoAtualizar();
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <div className="cartao" style={{ marginBottom: '1rem' }}>
        <h2>Registrar venda</h2>
        <Formulario
          aoEnviar={(e) => void aoRegistrar(e)}
          ocupado={ocupado}
          rotuloBotao="Registrar venda"
          erro={erro}
        >
          <div className="campo">
            <label htmlFor="venda-quantidade">Quantidade</label>
            <input
              id="venda-quantidade"
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              required
            />
          </div>
          <div className="campo">
            <label htmlFor="venda-preco">Preço unitário (R$)</label>
            <input
              id="venda-preco"
              type="number"
              min="0"
              step="0.01"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              required
            />
          </div>
          <div className="campo">
            <label htmlFor="venda-pagamento">Pagamento</label>
            <select
              id="venda-pagamento"
              value={pagamentoRecebido ? 'confirmado' : 'pendente'}
              onChange={(e) => setPagamentoRecebido(e.target.value === 'confirmado')}
            >
              <option value="confirmado">Recebido (PIX ou dinheiro)</option>
              <option value="pendente">Ainda não recebido</option>
            </select>
          </div>
        </Formulario>
        <p className="subtitulo" style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>
          Vendas sem pagamento confirmado entram no cálculo de <em>slippage</em> como esquecimento
          de pagamento.
        </p>
      </div>

      {erroReversao && <p className="mensagem-erro">{erroReversao}</p>}
      <div className="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th className="numero">Qtd.</th>
              <th className="numero">Preço</th>
              <th className="numero">Total</th>
              <th>Pagamento</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {vendas.length === 0 && (
              <tr>
                <td colSpan={6} className="subtitulo">
                  Nenhuma venda registrada.
                </td>
              </tr>
            )}
            {vendas.map((venda) => (
              <tr key={venda.id} style={venda.revertida_em ? { opacity: 0.55 } : undefined}>
                <td>{formatarDataHora(venda.data)}</td>
                <td className="numero">{venda.quantidade}</td>
                <td className="numero">{formatarMoeda(venda.preco_unitario)}</td>
                <td className="numero">{formatarMoeda(venda.quantidade * venda.preco_unitario)}</td>
                <td>
                  {venda.status_pagamento === 'confirmado' ? (
                    <span className="etiqueta etiqueta-sucesso">confirmado</span>
                  ) : (
                    <span className="etiqueta etiqueta-alerta">pendente</span>
                  )}
                </td>
                <td>
                  {venda.revertida_em ? (
                    <span className="etiqueta">revertida</span>
                  ) : (
                    <span className="linha-flex">
                      {venda.status_pagamento === 'pendente' && (
                        <button
                          type="button"
                          className="botao botao-secundario botao-pequeno"
                          onClick={() => void confirmarPagamento(venda.id).then(aoAtualizar)}
                        >
                          Confirmar pagamento
                        </button>
                      )}
                      <button
                        type="button"
                        className="botao botao-fantasma botao-pequeno"
                        onClick={() => void aoReverter(venda)}
                      >
                        Reverter
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Reposições (RF-STOCK-01/02)
// ---------------------------------------------------------------------------

function AbaReposicoes({
  listagem,
  reposicoes,
  aoAtualizar,
}: {
  listagem: Listagem;
  reposicoes: Reposicao[];
  aoAtualizar: () => Promise<void>;
}) {
  const [quantidade, setQuantidade] = useState('');
  const [custo, setCusto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [erroReversao, setErroReversao] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function aoRegistrar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      await registrarReposicao({
        listagem_id: listagem.id,
        quantidade: Number(quantidade),
        custo_unitario_compra: Number(custo),
      });
      setQuantidade('');
      setCusto('');
      await aoAtualizar();
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao));
    } finally {
      setOcupado(false);
    }
  }

  async function aoReverter(reposicao: Reposicao) {
    if (
      !window.confirm(
        'Reverter esta reposição? As unidades sairão do estoque e ela deixará de contar como gasto.',
      )
    ) {
      return;
    }
    setErroReversao(null);
    try {
      await reverterReposicao(reposicao.id);
      await aoAtualizar();
    } catch (excecao) {
      setErroReversao(excecao instanceof Error ? excecao.message : String(excecao));
    }
  }

  return (
    <>
      <div className="cartao" style={{ marginBottom: '1rem' }}>
        <h2>Registrar reposição</h2>
        <Formulario
          aoEnviar={(e) => void aoRegistrar(e)}
          ocupado={ocupado}
          rotuloBotao="Adicionar ao estoque"
          erro={erro}
        >
          <div className="campo">
            <label htmlFor="reposicao-quantidade">Quantidade</label>
            <input
              id="reposicao-quantidade"
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              required
            />
          </div>
          <div className="campo">
            <label htmlFor="reposicao-custo">Custo unitário de compra (R$)</label>
            <input
              id="reposicao-custo"
              type="number"
              min="0"
              step="0.01"
              value={custo}
              onChange={(e) => setCusto(e.target.value)}
              required
            />
          </div>
        </Formulario>
      </div>

      {erroReversao && <p className="mensagem-erro">{erroReversao}</p>}
      <div className="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th className="numero">Qtd.</th>
              <th className="numero">Custo unitário</th>
              <th className="numero">Custo total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {reposicoes.length === 0 && (
              <tr>
                <td colSpan={5} className="subtitulo">
                  Nenhuma reposição registrada.
                </td>
              </tr>
            )}
            {reposicoes.map((reposicao) => (
              <tr key={reposicao.id} style={reposicao.revertida_em ? { opacity: 0.55 } : undefined}>
                <td>{formatarDataHora(reposicao.data)}</td>
                <td className="numero">{reposicao.quantidade}</td>
                <td className="numero">{formatarMoeda(reposicao.custo_unitario_compra)}</td>
                <td className="numero">
                  {formatarMoeda(reposicao.quantidade * reposicao.custo_unitario_compra)}
                </td>
                <td>
                  {reposicao.revertida_em ? (
                    <span className="etiqueta">revertida</span>
                  ) : (
                    <button
                      type="button"
                      className="botao botao-fantasma botao-pequeno"
                      onClick={() => void aoReverter(reposicao)}
                    >
                      Reverter
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Perdas (RF-STOCK-05)
// ---------------------------------------------------------------------------

function AbaPerdas({
  listagem,
  perdas,
  aoAtualizar,
}: {
  listagem: Listagem;
  perdas: Perda[];
  aoAtualizar: () => Promise<void>;
}) {
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [erroReversao, setErroReversao] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function aoReverter(perda: Perda) {
    if (!window.confirm('Reverter esta perda? As unidades voltarão ao estoque.')) return;
    setErroReversao(null);
    try {
      await reverterPerda(perda.id);
      await aoAtualizar();
    } catch (excecao) {
      setErroReversao(excecao instanceof Error ? excecao.message : String(excecao));
    }
  }

  async function aoRegistrar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      await registrarPerda({
        listagem_id: listagem.id,
        quantidade: Number(quantidade),
        motivo: motivo.trim(),
      });
      setQuantidade('');
      setMotivo('');
      await aoAtualizar();
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <div className="cartao" style={{ marginBottom: '1rem' }}>
        <h2>Registrar perda</h2>
        <p className="subtitulo">
          Use para roubo, furto, avaria ou qualquer saída de estoque que não foi venda.
        </p>
        <Formulario
          aoEnviar={(e) => void aoRegistrar(e)}
          ocupado={ocupado}
          rotuloBotao="Registrar perda"
          erro={erro}
        >
          <div className="campo">
            <label htmlFor="perda-quantidade">Quantidade</label>
            <input
              id="perda-quantidade"
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              required
            />
          </div>
          <div className="campo">
            <label htmlFor="perda-motivo">Motivo</label>
            <input
              id="perda-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              placeholder="Ex.: furto durante o intervalo"
            />
          </div>
        </Formulario>
      </div>

      {erroReversao && <p className="mensagem-erro">{erroReversao}</p>}
      <div className="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th className="numero">Qtd.</th>
              <th>Motivo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {perdas.length === 0 && (
              <tr>
                <td colSpan={4} className="subtitulo">
                  Nenhuma perda registrada.
                </td>
              </tr>
            )}
            {perdas.map((perda) => (
              <tr key={perda.id} style={perda.revertida_em ? { opacity: 0.55 } : undefined}>
                <td>{formatarDataHora(perda.data)}</td>
                <td className="numero">{perda.quantidade}</td>
                <td style={{ whiteSpace: 'normal' }}>{perda.motivo}</td>
                <td>
                  {perda.revertida_em ? (
                    <span className="etiqueta">revertida</span>
                  ) : (
                    <button
                      type="button"
                      className="botao botao-fantasma botao-pequeno"
                      onClick={() => void aoReverter(perda)}
                    >
                      Reverter
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Preço e histórico (RF-STOCK-03)
// ---------------------------------------------------------------------------

function AbaPreco({
  listagem,
  precos,
  aoAtualizar,
}: {
  listagem: Listagem;
  precos: Preco[];
  aoAtualizar: () => Promise<void>;
}) {
  const [preco, setPreco] = useState(String(listagem.preco_atual));
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function aoAlterar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      await atualizarListagem(listagem.id, { preco_atual: Number(preco) });
      await aoAtualizar();
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <div className="cartao" style={{ marginBottom: '1rem' }}>
        <h2>Alterar preço de venda</h2>
        <Formulario
          aoEnviar={(e) => void aoAlterar(e)}
          ocupado={ocupado}
          rotuloBotao="Atualizar preço"
          erro={erro}
        >
          <div className="campo">
            <label htmlFor="novo-preco">Novo preço (R$)</label>
            <input
              id="novo-preco"
              type="number"
              min="0"
              step="0.01"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              required
            />
          </div>
        </Formulario>
      </div>

      <div className="cartao tabela-rolagem">
        <h2>Histórico de preços</h2>
        <table>
          <thead>
            <tr>
              <th className="numero">Preço</th>
              <th>Vigente de</th>
              <th>Até</th>
            </tr>
          </thead>
          <tbody>
            {precos.map((registro) => (
              <tr key={registro.id}>
                <td className="numero">{formatarMoeda(registro.preco)}</td>
                <td>{formatarDataHora(registro.vigente_de)}</td>
                <td>{registro.vigente_ate ? formatarDataHora(registro.vigente_ate) : 'atual'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
