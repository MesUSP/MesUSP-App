import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { criarMesinha, listarMesinhas } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Link } from '../router';
import type { Mesinha, TipoMesinha } from '../types';

export function MesinhasPage() {
  const { sessao, perfil } = useAuth();
  const [mesinhas, setMesinhas] = useState<Mesinha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoMesinha>('descentralizada');
  const [descricao, setDescricao] = useState('');
  const [criando, setCriando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setMesinhas(await listarMesinhas());
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao));
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function aoCriar(evento: FormEvent) {
    evento.preventDefault();
    if (!sessao) return;
    setCriando(true);
    setErro(null);
    try {
      await criarMesinha({
        nome: nome.trim(),
        tipo,
        descricao: descricao.trim(),
        proprietario_id: sessao.user.id,
      });
      setNome('');
      setDescricao('');
      setMostrarFormulario(false);
      await carregar();
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao));
    } finally {
      setCriando(false);
    }
  }

  const usuarioId = sessao?.user.id;
  const ativas = (mesinhas ?? []).filter((m) => m.status === 'ativa');
  const arquivadas = (mesinhas ?? []).filter((m) => m.status === 'arquivada');
  const minhas = (mesinhas ?? []).filter((m) => m.proprietario_id === usuarioId).length;
  // O limite vem da categoria da conta (null = sem limite).
  const limite = perfil?.categorias?.limite_mesinhas;
  const usoDaConta =
    limite != null
      ? `Você usa ${minhas} de ${limite} mesinhas da sua conta.`
      : `Você usa ${minhas} ${minhas === 1 ? 'mesinha' : 'mesinhas'}, sem limite na sua categoria.`;

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Minhas mesinhas</h1>
          <p className="subtitulo">
            Mesinhas que você administra ou nas quais colabora. {usoDaConta}
          </p>
        </div>
        <button
          type="button"
          className="botao"
          onClick={() => setMostrarFormulario((visivel) => !visivel)}
        >
          {mostrarFormulario ? 'Cancelar' : 'Nova mesinha'}
        </button>
      </div>

      {erro && <p className="mensagem-erro">{erro}</p>}

      {mostrarFormulario && (
        <div className="cartao" style={{ marginBottom: '1rem' }}>
          <h2>Nova mesinha</h2>
          <form className="formulario" onSubmit={(e) => void aoCriar(e)}>
            <div className="formulario-linha">
              <div className="campo">
                <label htmlFor="nome-mesinha">Nome</label>
                <input
                  id="nome-mesinha"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  placeholder="Mesinha do CAMat"
                />
              </div>
              <div className="campo">
                <label htmlFor="tipo-mesinha">Tipo</label>
                <select
                  id="tipo-mesinha"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoMesinha)}
                >
                  <option value="descentralizada">Descentralizada — vários vendedores</option>
                  <option value="centralizada">Centralizada — só o proprietário vende</option>
                </select>
              </div>
            </div>
            <div className="campo">
              <label htmlFor="descricao-mesinha">Localização ou descrição</label>
              <textarea
                id="descricao-mesinha"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
                placeholder="Em frente à sala do centro acadêmico…"
              />
            </div>
            <div>
              <button type="submit" className="botao" disabled={criando}>
                {criando ? 'Criando…' : 'Criar mesinha'}
              </button>
            </div>
          </form>
        </div>
      )}

      {mesinhas === null ? (
        <p className="subtitulo">Carregando…</p>
      ) : mesinhas.length === 0 ? (
        <div className="cartao">
          <p>Você ainda não participa de nenhuma mesinha.</p>
          <p className="subtitulo">
            Crie a sua primeira mesinha ou peça um convite ao proprietário de uma existente.
          </p>
        </div>
      ) : (
        <>
          {ativas.length === 0 ? (
            <div className="cartao">
              <p>Nenhuma mesinha ativa.</p>
            </div>
          ) : (
            <div className="grade">
              {ativas.map((mesinha) => (
                <CartaoMesinha key={mesinha.id} mesinha={mesinha} usuarioId={usuarioId} />
              ))}
            </div>
          )}

          {arquivadas.length > 0 && (
            <div className="secao">
              <h2>Mesinhas arquivadas</h2>
              <p className="subtitulo">
                Visíveis apenas para você. Desarquive nas configurações da mesinha.
              </p>
              <div className="grade">
                {arquivadas.map((mesinha) => (
                  <CartaoMesinha key={mesinha.id} mesinha={mesinha} usuarioId={usuarioId} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function CartaoMesinha({ mesinha, usuarioId }: { mesinha: Mesinha; usuarioId?: string }) {
  return (
    <Link para={`/mesinhas/${mesinha.id}`} className="cartao cartao-link">
      <div className="linha-flex">
        <h2 style={{ marginBottom: 0 }}>{mesinha.nome}</h2>
        <span className="espacador" />
        {mesinha.proprietario_id === usuarioId ? (
          <span className="etiqueta etiqueta-primaria">proprietário</span>
        ) : (
          <span className="etiqueta">colaborador</span>
        )}
      </div>
      <p className="subtitulo" style={{ margin: '0.4rem 0' }}>
        {mesinha.descricao || 'Sem descrição.'}
      </p>
      <div className="linha-flex">
        <span className="etiqueta">{mesinha.tipo}</span>
        {!mesinha.ativo && <span className="etiqueta etiqueta-alerta">desativada</span>}
        {mesinha.status === 'arquivada' && <span className="etiqueta etiqueta-erro">arquivada</span>}
      </div>
    </Link>
  );
}
