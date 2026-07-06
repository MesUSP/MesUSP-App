// Tela administrativa da categoria desenvolvedor: lista de contas com uso
// dos limites, mudança de categoria e remoção de contas. O acesso é barrado
// pelo backend (RPCs restritas); o guard de rota em App.tsx é só UX.

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  alterarCategoriaUsuario,
  listarCategorias,
  listarUsuariosAdmin,
  removerUsuarioAdmin,
} from '../lib/api';
import type { Categoria, UsuarioAdmin } from '../types';

export function DesenvolvedorPage() {
  const { perfil } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[] | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [listaUsuarios, listaCategorias] = await Promise.all([
        listarUsuariosAdmin(),
        listarCategorias(),
      ]);
      setUsuarios(listaUsuarios);
      setCategorias(listaCategorias);
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao));
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function executar(acao: () => Promise<void>) {
    setErro(null);
    setOcupado(true);
    try {
      await acao();
      await carregar();
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao));
    } finally {
      setOcupado(false);
    }
  }

  function aoMudarCategoria(usuario: UsuarioAdmin, novaCategoria: string) {
    if (novaCategoria === usuario.categoria_id) return;
    const nomeNova =
      categorias.find((c) => c.id === novaCategoria)?.nome ?? novaCategoria;
    if (
      !window.confirm(
        `Mudar a categoria de ${usuario.nome} (${usuario.email}) para “${nomeNova}”?`,
      )
    ) {
      return;
    }
    void executar(() => alterarCategoriaUsuario(usuario.id, novaCategoria));
  }

  function aoRemover(usuario: UsuarioAdmin) {
    const confirmado =
      window.confirm(
        `Remover a conta de ${usuario.nome} (${usuario.email})? As mesinhas, itens e listagens dela desaparecerão do aplicativo para todos — inclusive para a própria pessoa — e NÃO poderão ser recuperados pelo aplicativo. A pessoa poderá criar uma conta nova com o mesmo e-mail, começando do zero.`,
      ) && window.confirm('Tem certeza? Esta ação não pode ser desfeita.');
    if (!confirmado) return;
    void executar(() => removerUsuarioAdmin(usuario.id));
  }

  function formatarLimites(usuario: UsuarioAdmin): {
    mesinhas: string;
    itens: string;
  } {
    const categoria = categorias.find((c) => c.id === usuario.categoria_id);
    return {
      mesinhas: `${usuario.mesinhas_no_limite}${categoria?.limite_mesinhas != null ? ` de ${categoria.limite_mesinhas}` : ''}`,
      itens: `${usuario.itens_no_limite}${categoria?.limite_itens != null ? ` de ${categoria.limite_itens}` : ''}`,
    };
  }

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Desenvolvedor</h1>
          <p className="subtitulo">
            Contas cadastradas no aplicativo, com categoria e uso dos limites. Visível apenas para
            a categoria Desenvolvedor do UniMesinha.
          </p>
        </div>
      </div>

      {erro && <p className="mensagem-erro">{erro}</p>}

      {usuarios === null ? (
        <p className="subtitulo">Carregando…</p>
      ) : (
        <div className="cartao tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Status</th>
                <th className="numero">Mesinhas</th>
                <th className="numero">Itens</th>
                <th>Categoria</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => {
                const propria = usuario.id === perfil?.id;
                const uso = formatarLimites(usuario);
                return (
                  <tr key={usuario.id}>
                    <td>
                      {usuario.nome}
                      {propria && (
                        <span className="etiqueta etiqueta-primaria" style={{ marginLeft: '0.4rem' }}>
                          você
                        </span>
                      )}
                    </td>
                    <td>{usuario.email}</td>
                    <td>
                      <span
                        className={
                          usuario.status === 'ativa'
                            ? 'etiqueta etiqueta-sucesso'
                            : usuario.status === 'arquivada'
                              ? 'etiqueta etiqueta-alerta'
                              : 'etiqueta etiqueta-erro'
                        }
                      >
                        {usuario.status}
                      </span>
                    </td>
                    <td className="numero">{uso.mesinhas}</td>
                    <td className="numero">{uso.itens}</td>
                    <td>
                      {/* A própria categoria não é alterável (o backend também barra). */}
                      {propria ? (
                        usuario.categoria_nome
                      ) : (
                        <select
                          aria-label={`Categoria de ${usuario.nome}`}
                          value={usuario.categoria_id}
                          disabled={ocupado || usuario.status === 'removida'}
                          onChange={(e) => aoMudarCategoria(usuario, e.target.value)}
                        >
                          {categorias.map((categoria) => (
                            <option key={categoria.id} value={categoria.id}>
                              {categoria.nome}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {!propria && usuario.status !== 'removida' && (
                        <button
                          type="button"
                          className="botao botao-perigo botao-pequeno"
                          disabled={ocupado}
                          onClick={() => aoRemover(usuario)}
                        >
                          Remover
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
