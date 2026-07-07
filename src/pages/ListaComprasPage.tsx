// Lista de compras imprimível (relatórios avançados): itens do usuário com a
// reposição recomendada para o filtro escolhido nos relatórios. Análoga ao
// cardápio digital/folha A4: uma folha clara com botão de imprimir.
// O backend (RPC lista_compras) barra categorias sem relatórios avançados.

import { useEffect, useMemo, useState } from 'react';
import { listaCompras } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Link } from '../router';
import { formatarData, ROTULOS_PERIODO, type Periodo } from '../lib/format';
import type { LinhaListaCompras } from '../types';

function lerParametros(): {
  periodo: Periodo;
  mesinhaId?: string;
  categoriaItem?: string;
  itemId?: string;
} {
  const parametros = new URLSearchParams(window.location.search);
  const periodo = parametros.get('periodo');
  return {
    periodo: periodo === 'dia' || periodo === 'semana' || periodo === 'mes' ? periodo : 'semana',
    mesinhaId: parametros.get('mesinha') ?? undefined,
    categoriaItem: parametros.get('categoria') ?? undefined,
    itemId: parametros.get('item') ?? undefined,
  };
}

export function ListaComprasPage() {
  const { perfil } = useAuth();
  const avancado = perfil?.categorias?.relatorios_avancados === true;
  const [{ periodo, mesinhaId, categoriaItem, itemId }] = useState(lerParametros);
  const [linhas, setLinhas] = useState<LinhaListaCompras[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!perfil || !avancado) return;
    listaCompras(periodo, { mesinhaId, categoriaItem, itemId })
      .then(setLinhas)
      .catch((excecao) => setErro(excecao instanceof Error ? excecao.message : String(excecao)));
  }, [perfil, avancado, periodo, mesinhaId, categoriaItem, itemId]);

  const grupos = useMemo(() => {
    const porMesinha = new Map<string, { nome: string; linhas: LinhaListaCompras[] }>();
    for (const linha of linhas ?? []) {
      const grupo = porMesinha.get(linha.mesinha_id) ?? { nome: linha.mesinha_nome, linhas: [] };
      grupo.linhas.push(linha);
      porMesinha.set(linha.mesinha_id, grupo);
    }
    return [...porMesinha.values()];
  }, [linhas]);

  if (perfil && !avancado) {
    return (
      <div className="cartao" style={{ maxWidth: 480 }}>
        <h1>Lista de compras</h1>
        <p className="subtitulo">
          A lista de compras faz parte dos relatórios avançados e não está disponível para a sua
          categoria de conta.
        </p>
        <Link para="/relatorios">Voltar aos relatórios</Link>
      </div>
    );
  }

  const filtros = [
    mesinhaId ? null : 'todas as minhas mesinhas',
    categoriaItem ? `categoria: ${categoriaItem}` : null,
    itemId ? 'item específico' : null,
  ].filter(Boolean);

  return (
    <>
      <div className="linha-flex nao-imprimir" style={{ marginBottom: '1rem' }}>
        <div>
          <h1>Lista de compras</h1>
          <p className="subtitulo">
            Reposição recomendada dos seus itens para o filtro escolhido nos relatórios.
          </p>
        </div>
        <span className="espacador" />
        <Link para="/relatorios" className="botao botao-fantasma">
          Voltar
        </Link>
        <button type="button" className="botao" onClick={() => window.print()}>
          Imprimir
        </button>
      </div>

      {erro && <p className="mensagem-erro">{erro}</p>}
      {!erro && linhas === null && <p className="subtitulo">Carregando…</p>}

      {linhas !== null && (
        <div className="folha-a4">
          <h1>Lista de compras</h1>
          <p className="subtitulo" style={{ textAlign: 'center' }}>
            {perfil?.nome} · {formatarData(new Date().toISOString())} · com base em:{' '}
            {ROTULOS_PERIODO[periodo].toLowerCase()}
            {filtros.length > 0 && ` · ${filtros.join(' · ')}`}
          </p>

          {linhas.length === 0 && (
            <p className="subtitulo" style={{ textAlign: 'center' }}>
              Nenhum item seu corresponde ao filtro escolhido.
            </p>
          )}

          {grupos.map((grupo) => (
            <section key={grupo.nome}>
              <h2 style={{ marginTop: '1.25rem' }}>{grupo.nome}</h2>
              {grupo.linhas.map((linha) => (
                <div key={`${linha.mesinha_id}-${linha.item_id}`} className="produto-impresso">
                  <div>
                    <strong>{linha.item_nome}</strong>
                    <span className="subtitulo" style={{ marginLeft: 8, fontSize: '0.85rem' }}>
                      {linha.item_categoria}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong>comprar {linha.reposicao_recomendada} un.</strong>
                    <div className="subtitulo" style={{ fontSize: '0.8rem' }}>
                      estoque atual: {linha.estoque_atual}
                    </div>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
