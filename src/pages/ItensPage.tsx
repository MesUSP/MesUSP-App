import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { atualizarItem, criarItem, listarMeusItens } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Item } from '../types';

const CATEGORIAS = ['doces', 'salgados', 'bebidas', 'outros'];

export function ItensPage() {
  const { sessao } = useAuth();
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<Item | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('doces');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!sessao) return;
    try {
      setItens(await listarMeusItens(sessao.user.id));
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao));
    }
  }, [sessao]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function iniciarEdicao(item: Item) {
    setEditando(item);
    setNome(item.nome);
    setCategoria(item.categoria);
    setDescricao(item.descricao);
    setMostrarFormulario(true);
  }

  function iniciarCriacao() {
    setEditando(null);
    setNome('');
    setCategoria('doces');
    setDescricao('');
    setMostrarFormulario(true);
  }

  async function aoSalvar(evento: FormEvent) {
    evento.preventDefault();
    if (!sessao) return;
    setSalvando(true);
    setErro(null);
    try {
      if (editando) {
        await atualizarItem(editando.id, {
          nome: nome.trim(),
          categoria,
          descricao: descricao.trim(),
        });
      } else {
        await criarItem({
          dono_id: sessao.user.id,
          nome: nome.trim(),
          categoria,
          descricao: descricao.trim(),
        });
      }
      setMostrarFormulario(false);
      await carregar();
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Meus itens</h1>
          <p className="subtitulo">
            Produtos que você vende. Um mesmo item pode ser listado em várias mesinhas.
          </p>
        </div>
        <button type="button" className="botao" onClick={iniciarCriacao}>
          Novo item
        </button>
      </div>

      {erro && <p className="mensagem-erro">{erro}</p>}

      {mostrarFormulario && (
        <div className="cartao" style={{ marginBottom: '1rem' }}>
          <h2>{editando ? `Editar ${editando.nome}` : 'Novo item'}</h2>
          <form className="formulario" onSubmit={(e) => void aoSalvar(e)}>
            <div className="formulario-linha">
              <div className="campo">
                <label htmlFor="nome-item">Nome</label>
                <input
                  id="nome-item"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  placeholder="Brownie do PIH"
                />
              </div>
              <div className="campo">
                <label htmlFor="categoria-item">Categoria</label>
                <select
                  id="categoria-item"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  {CATEGORIAS.map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {opcao}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="campo">
              <label htmlFor="descricao-item">Descrição</label>
              <textarea
                id="descricao-item"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
              />
            </div>
            <div className="linha-flex">
              <button type="submit" className="botao" disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
              <button
                type="button"
                className="botao botao-fantasma"
                onClick={() => setMostrarFormulario(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {itens === null ? (
        <p className="subtitulo">Carregando…</p>
      ) : itens.length === 0 ? (
        <div className="cartao">
          <p>Você ainda não cadastrou itens.</p>
          <p className="subtitulo">
            Cadastre um produto e depois liste-o em uma mesinha para começar a vender.
          </p>
        </div>
      ) : (
        <div className="grade">
          {itens.map((item) => (
            <div key={item.id} className="cartao">
              <div className="linha-flex">
                <h2 style={{ marginBottom: 0 }}>{item.nome}</h2>
                <span className="espacador" />
                <span className="etiqueta">{item.categoria}</span>
              </div>
              <p className="subtitulo" style={{ margin: '0.4rem 0' }}>
                {item.descricao || 'Sem descrição.'}
              </p>
              <button
                type="button"
                className="botao botao-secundario botao-pequeno"
                onClick={() => iniciarEdicao(item)}
              >
                Editar
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
