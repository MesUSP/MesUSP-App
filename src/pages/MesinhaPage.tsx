import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  atualizarMesinha,
  convidarColaborador,
  criarListagem,
  desconectarGoogle,
  listarListagensDaMesinha,
  listarMembros,
  listarMeusItens,
  obterAccessTokenGoogle,
  obterConexaoGoogle,
  obterMesinha,
  removerColaborador,
  sincronizarPlanilha,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Link, useRoteador } from '../router';
import { QrCodeSvg } from '../components/QrCodeSvg';
import { formatarMoeda } from '../lib/format';
import { iniciarConexaoGoogle } from '../lib/google';
import { escolherPlanilha } from '../lib/googlePicker';
import type { ConexaoGoogle, Item, Listagem, Mesinha, MesinhaMembro } from '../types';

type Aba = 'itens' | 'colaboradores' | 'cardapio' | 'configuracoes';

interface Mensagem {
  tipo: 'erro' | 'sucesso';
  texto: string;
}

export function MesinhaPage({ id }: { id: string }) {
  const { sessao } = useAuth();
  const [mesinha, setMesinha] = useState<Mesinha | null>(null);
  const [listagens, setListagens] = useState<Listagem[]>([]);
  const [membros, setMembros] = useState<MesinhaMembro[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('itens');

  const usuarioId = sessao?.user.id;
  const souProprietario = mesinha !== null && mesinha.proprietario_id === usuarioId;

  const carregar = useCallback(async () => {
    try {
      const dados = await obterMesinha(id);
      setMesinha(dados);
      const [novasListagens, novosMembros] = await Promise.all([
        listarListagensDaMesinha(id),
        listarMembros(id),
      ]);
      setListagens(novasListagens);
      setMembros(novosMembros);
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao));
    }
  }, [id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (erro && !mesinha) {
    return <p className="mensagem-erro">{erro}</p>;
  }
  if (!mesinha) {
    return <p className="subtitulo">Carregando…</p>;
  }

  const abas: { chave: Aba; rotulo: string }[] = [
    { chave: 'itens', rotulo: `Itens (${listagens.filter((l) => l.status === 'ativa').length})` },
    { chave: 'colaboradores', rotulo: `Colaboradores (${membros.length})` },
    { chave: 'cardapio', rotulo: 'Cardápio e QR' },
    ...(souProprietario ? [{ chave: 'configuracoes' as Aba, rotulo: 'Configurações' }] : []),
  ];

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>{mesinha.nome}</h1>
          <p className="subtitulo">{mesinha.descricao || 'Sem descrição.'}</p>
        </div>
        <div className="linha-flex">
          <span className="etiqueta">{mesinha.tipo}</span>
          {!mesinha.ativo && <span className="etiqueta etiqueta-alerta">desativada</span>}
          {mesinha.arquivada && <span className="etiqueta etiqueta-erro">arquivada</span>}
        </div>
      </div>

      {erro && <p className="mensagem-erro">{erro}</p>}

      <div className="abas" role="tablist">
        {abas.map((opcao) => (
          <button
            key={opcao.chave}
            type="button"
            role="tab"
            aria-selected={aba === opcao.chave}
            className={aba === opcao.chave ? 'ativa' : undefined}
            onClick={() => setAba(opcao.chave)}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>

      {aba === 'itens' && (
        <AbaItens
          mesinha={mesinha}
          listagens={listagens}
          usuarioId={usuarioId ?? ''}
          souProprietario={souProprietario}
          aoAtualizar={carregar}
        />
      )}
      {aba === 'colaboradores' && (
        <AbaColaboradores
          mesinha={mesinha}
          membros={membros}
          souProprietario={souProprietario}
          aoAtualizar={carregar}
        />
      )}
      {aba === 'cardapio' && <AbaCardapio mesinha={mesinha} />}
      {aba === 'configuracoes' && souProprietario && (
        <AbaConfiguracoes mesinha={mesinha} aoAtualizar={carregar} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Aba: itens listados na mesinha
// ---------------------------------------------------------------------------

function AbaItens({
  mesinha,
  listagens,
  usuarioId,
  souProprietario,
  aoAtualizar,
}: {
  mesinha: Mesinha;
  listagens: Listagem[];
  usuarioId: string;
  souProprietario: boolean;
  aoAtualizar: () => Promise<void>;
}) {
  const [meusItens, setMeusItens] = useState<Item[]>([]);
  const [itemId, setItemId] = useState('');
  const [preco, setPreco] = useState('');
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [adicionando, setAdicionando] = useState(false);

  const podeAdicionar = souProprietario || mesinha.tipo === 'descentralizada';

  useEffect(() => {
    if (!podeAdicionar || !usuarioId) return;
    void listarMeusItens(usuarioId).then(setMeusItens).catch(() => setMeusItens([]));
  }, [podeAdicionar, usuarioId]);

  const jaListados = new Set(listagens.map((l) => l.item_id));
  const disponiveis = meusItens.filter((item) => !jaListados.has(item.id));

  async function aoAdicionar(evento: FormEvent) {
    evento.preventDefault();
    setMensagem(null);
    setAdicionando(true);
    try {
      await criarListagem({
        item_id: itemId,
        mesinha_id: mesinha.id,
        dono_id: usuarioId,
        preco_atual: Number(preco),
      });
      setItemId('');
      setPreco('');
      await aoAtualizar();
    } catch (excecao) {
      setMensagem({
        tipo: 'erro',
        texto: excecao instanceof Error ? excecao.message : String(excecao),
      });
    } finally {
      setAdicionando(false);
    }
  }

  const ativas = listagens.filter((l) => l.status === 'ativa');
  const arquivadas = listagens.filter((l) => l.status === 'arquivada');

  return (
    <>
      {podeAdicionar && (
        <div className="cartao" style={{ marginBottom: '1rem' }}>
          <h2>Adicionar item à mesinha</h2>
          {disponiveis.length === 0 ? (
            <p className="subtitulo">
              Todos os seus itens já estão listados aqui. Cadastre novos itens em{' '}
              <Link para="/itens">Meus itens</Link>.
            </p>
          ) : (
            <form className="formulario" onSubmit={(e) => void aoAdicionar(e)}>
              <div className="formulario-linha">
                <div className="campo">
                  <label htmlFor="item-listar">Item</label>
                  <select
                    id="item-listar"
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    required
                  >
                    <option value="">Selecione…</option>
                    {disponiveis.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="campo">
                  <label htmlFor="preco-listar">Preço de venda (R$)</label>
                  <input
                    id="preco-listar"
                    type="number"
                    min="0"
                    step="0.01"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    required
                  />
                </div>
              </div>
              {mensagem && <p className="mensagem-erro">{mensagem.texto}</p>}
              <div>
                <button type="submit" className="botao" disabled={adicionando}>
                  {adicionando ? 'Adicionando…' : 'Listar item'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {!podeAdicionar && (
        <p className="subtitulo" style={{ marginBottom: '1rem' }}>
          Esta mesinha é centralizada: apenas o proprietário gerencia os itens.
        </p>
      )}

      {ativas.length === 0 ? (
        <div className="cartao">
          <p>Nenhum item listado nesta mesinha ainda.</p>
        </div>
      ) : (
        <div className="cartao tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Vendedor</th>
                <th className="numero">Preço</th>
                <th className="numero">Estoque</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ativas.map((listagem) => {
                const minha = listagem.dono_id === usuarioId;
                return (
                  <tr key={listagem.id}>
                    <td>{listagem.itens?.nome}</td>
                    <td>
                      {minha ? (
                        <span className="etiqueta etiqueta-primaria">meu item</span>
                      ) : (
                        listagem.profiles?.nome
                      )}
                    </td>
                    <td className="numero">{formatarMoeda(listagem.preco_atual)}</td>
                    <td className="numero">{listagem.estoque_atual}</td>
                    <td>
                      {minha && (
                        <Link para={`/listagens/${listagem.id}`} className="botao botao-secundario botao-pequeno">
                          Gerenciar
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {arquivadas.length > 0 && (
        <div className="secao">
          <h2>Listagens arquivadas</h2>
          <div className="cartao tabela-rolagem">
            <table>
              <tbody>
                {arquivadas.map((listagem) => (
                  <tr key={listagem.id}>
                    <td>{listagem.itens?.nome}</td>
                    <td>{listagem.profiles?.nome}</td>
                    <td className="numero">{formatarMoeda(listagem.preco_atual)}</td>
                    <td>
                      <span className="etiqueta">arquivada</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Aba: colaboradores
// ---------------------------------------------------------------------------

function AbaColaboradores({
  mesinha,
  membros,
  souProprietario,
  aoAtualizar,
}: {
  mesinha: Mesinha;
  membros: MesinhaMembro[];
  souProprietario: boolean;
  aoAtualizar: () => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [processando, setProcessando] = useState(false);

  async function aoConvidar(evento: FormEvent) {
    evento.preventDefault();
    setMensagem(null);
    setProcessando(true);
    try {
      await convidarColaborador(mesinha.id, email.trim());
      setEmail('');
      setMensagem({ tipo: 'sucesso', texto: 'Colaborador adicionado à mesinha.' });
      await aoAtualizar();
    } catch (excecao) {
      setMensagem({
        tipo: 'erro',
        texto: excecao instanceof Error ? excecao.message : String(excecao),
      });
    } finally {
      setProcessando(false);
    }
  }

  async function aoRemover(membro: MesinhaMembro) {
    const confirmado = window.confirm(
      `Remover ${membro.profiles?.nome ?? 'este colaborador'}? As listagens dele sairão da mesinha, mas ficarão arquivadas na conta dele.`,
    );
    if (!confirmado) return;
    setMensagem(null);
    try {
      await removerColaborador(mesinha.id, membro.usuario_id);
      await aoAtualizar();
    } catch (excecao) {
      setMensagem({
        tipo: 'erro',
        texto: excecao instanceof Error ? excecao.message : String(excecao),
      });
    }
  }

  return (
    <>
      {souProprietario && (
        <div className="cartao" style={{ marginBottom: '1rem' }}>
          <h2>Convidar colaborador</h2>
          <p className="subtitulo">
            A pessoa precisa já ter uma conta no UniMesinha com este e-mail.
          </p>
          <form className="formulario" onSubmit={(e) => void aoConvidar(e)}>
            <div className="formulario-linha">
              <div className="campo">
                <label htmlFor="email-convite">E-mail</label>
                <input
                  id="email-convite"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            {mensagem && (
              <p className={mensagem.tipo === 'erro' ? 'mensagem-erro' : 'mensagem-sucesso'}>
                {mensagem.texto}
              </p>
            )}
            <div>
              <button type="submit" className="botao" disabled={processando}>
                {processando ? 'Convidando…' : 'Convidar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              {souProprietario && <th />}
            </tr>
          </thead>
          <tbody>
            {membros.map((membro) => (
              <tr key={membro.usuario_id}>
                <td>{membro.profiles?.nome}</td>
                <td>{membro.profiles?.email}</td>
                <td>
                  <span
                    className={
                      membro.papel === 'proprietario' ? 'etiqueta etiqueta-primaria' : 'etiqueta'
                    }
                  >
                    {membro.papel}
                  </span>
                </td>
                {souProprietario && (
                  <td>
                    {membro.papel !== 'proprietario' && (
                      <button
                        type="button"
                        className="botao botao-perigo botao-pequeno"
                        onClick={() => void aoRemover(membro)}
                      >
                        Remover
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Aba: cardápio digital e QR code (RF-MENU-01/03)
// ---------------------------------------------------------------------------

function AbaCardapio({ mesinha }: { mesinha: Mesinha }) {
  const url = `${window.location.origin}/cardapio/${mesinha.id}`;
  return (
    <div className="grade">
      <div className="cartao qr-impressao">
        <h2>QR code do cardápio</h2>
        <QrCodeSvg valor={url} rotulo={`QR code do cardápio da ${mesinha.nome}`} />
        <p className="subtitulo" style={{ wordBreak: 'break-all' }}>{url}</p>
        <div className="linha-flex nao-imprimir">
          <Link para={`/mesinhas/${mesinha.id}/imprimir-qr`} className="botao botao-secundario">
            Imprimir QR code
          </Link>
          <Link para={`/cardapio/${mesinha.id}`} className="botao botao-fantasma">
            Abrir cardápio
          </Link>
        </div>
      </div>
      <div className="cartao">
        <h2>Como usar</h2>
        <p className="subtitulo">
          Imprima o QR code e deixe-o na mesinha. Quem passar escaneia o código, vê o cardápio com
          os itens ativos e paga direto no PIX do vendedor de cada item.
        </p>
        <p className="subtitulo">
          O cardápio também pode ser impresso em papel: abra-o e use o botão “Imprimir cardápio”.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: configurações do proprietário (RF-TABLE-02, RF-SYNC)
// ---------------------------------------------------------------------------

function AbaConfiguracoes({
  mesinha,
  aoAtualizar,
}: {
  mesinha: Mesinha;
  aoAtualizar: () => Promise<void>;
}) {
  const { navegar } = useRoteador();
  const [nome, setNome] = useState(mesinha.nome);
  const [tipo, setTipo] = useState(mesinha.tipo);
  const [descricao, setDescricao] = useState(mesinha.descricao);
  const [planilhaId, setPlanilhaId] = useState(mesinha.planilha_id ?? '');
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [conexao, setConexao] = useState<ConexaoGoogle | null>(null);
  const [escolhendo, setEscolhendo] = useState(false);

  const recarregarConexao = useCallback(async () => {
    try {
      setConexao(await obterConexaoGoogle());
    } catch {
      setConexao(null);
    }
  }, []);

  useEffect(() => {
    void recarregarConexao();
  }, [recarregarConexao]);

  async function executar(acao: () => Promise<void>, sucesso: string) {
    setMensagem(null);
    try {
      await acao();
      setMensagem({ tipo: 'sucesso', texto: sucesso });
      await aoAtualizar();
    } catch (excecao) {
      setMensagem({
        tipo: 'erro',
        texto: excecao instanceof Error ? excecao.message : String(excecao),
      });
    }
  }

  async function aoSalvar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    await executar(
      () =>
        atualizarMesinha(mesinha.id, {
          nome: nome.trim(),
          tipo,
          descricao: descricao.trim(),
        }),
      'Mesinha atualizada.',
    );
    setSalvando(false);
  }

  async function aoSincronizar() {
    setSincronizando(true);
    await executar(() => sincronizarPlanilha(mesinha.id), 'Planilha sincronizada com sucesso.');
    setSincronizando(false);
  }

  // Vincula a planilha pelo Google Picker: com o escopo drive.file, é a escolha
  // no Picker que autoriza o app a escrever nela (não basta colar o ID).
  async function aoEscolherPlanilha() {
    setMensagem(null);
    setEscolhendo(true);
    try {
      const token = await obterAccessTokenGoogle();
      const escolhida = await escolherPlanilha(token);
      if (escolhida) {
        await atualizarMesinha(mesinha.id, { planilha_id: escolhida.id });
        setPlanilhaId(escolhida.id);
        setMensagem({ tipo: 'sucesso', texto: `Planilha “${escolhida.nome}” vinculada.` });
        await aoAtualizar();
      }
    } catch (excecao) {
      setMensagem({
        tipo: 'erro',
        texto: excecao instanceof Error ? excecao.message : String(excecao),
      });
    }
    setEscolhendo(false);
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="cartao">
        <h2>Dados da mesinha</h2>
        <form className="formulario" onSubmit={(e) => void aoSalvar(e)}>
          <div className="formulario-linha">
            <div className="campo">
              <label htmlFor="editar-nome">Nome</label>
              <input
                id="editar-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="editar-tipo">Tipo</label>
              <select
                id="editar-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as Mesinha['tipo'])}
              >
                <option value="descentralizada">Descentralizada</option>
                <option value="centralizada">Centralizada</option>
              </select>
            </div>
          </div>
          <div className="campo">
            <label htmlFor="editar-descricao">Localização ou descrição</label>
            <textarea
              id="editar-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
            />
          </div>
          {mensagem && (
            <p className={mensagem.tipo === 'erro' ? 'mensagem-erro' : 'mensagem-sucesso'}>
              {mensagem.texto}
            </p>
          )}
          <div className="linha-flex">
            <button type="submit" className="botao" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>

      <div className="cartao">
        <h2>Sincronização com Google Planilhas</h2>
        <p className="subtitulo">
          A sincronização é unidirecional: o MesUSP é a fonte de verdade e sobrescreve as abas
          Listagens, Reposições, Vendas e Perdas da planilha. A escrita usa a sua conta Google — não
          há conta de serviço, e você pode revogar o acesso quando quiser.
        </p>
        {conexao ? (
          <p className="mensagem-sucesso">
            Conta Google conectada{conexao.email_google ? ` (${conexao.email_google})` : ''}.
          </p>
        ) : (
          <p className="subtitulo">Nenhuma conta Google conectada.</p>
        )}
        {conexao && (
          <p className="subtitulo" style={{ fontSize: '0.82rem' }}>
            {planilhaId ? (
              <>
                Planilha vinculada: <code>{planilhaId}</code>
              </>
            ) : (
              'Nenhuma planilha vinculada. Escolha a planilha da organização pelo Google Picker.'
            )}
          </p>
        )}
        <div className="linha-flex">
          {conexao ? (
            <button
              type="button"
              className="botao botao-fantasma"
              onClick={() =>
                void executar(async () => {
                  await desconectarGoogle();
                  await recarregarConexao();
                }, 'Conta Google desconectada.')
              }
            >
              Desconectar conta Google
            </button>
          ) : (
            <button
              type="button"
              className="botao botao-secundario"
              onClick={() => iniciarConexaoGoogle(window.location.pathname)}
            >
              Conectar conta Google
            </button>
          )}
          <button
            type="button"
            className="botao botao-secundario"
            disabled={escolhendo || !conexao}
            onClick={() => void aoEscolherPlanilha()}
          >
            {escolhendo ? 'Abrindo…' : planilhaId ? 'Trocar planilha' : 'Escolher planilha'}
          </button>
          <button
            type="button"
            className="botao"
            disabled={sincronizando || !mesinha.planilha_id || !conexao}
            onClick={() => void aoSincronizar()}
          >
            {sincronizando ? 'Sincronizando…' : 'Sincronizar planilha agora'}
          </button>
        </div>
        {!conexao && (
          <p className="subtitulo" style={{ fontSize: '0.82rem' }}>
            Conecte uma conta Google com acesso de edição à planilha da organização para vinculá-la e
            sincronizar.
          </p>
        )}
      </div>

      <div className="cartao">
        <h2>Situação</h2>
        <p className="subtitulo">
          Desativar esconde a mesinha do cardápio público; arquivar encerra a operação dela.
        </p>
        <div className="linha-flex">
          <button
            type="button"
            className="botao botao-fantasma"
            onClick={() =>
              void executar(
                () => atualizarMesinha(mesinha.id, { ativo: !mesinha.ativo }),
                mesinha.ativo ? 'Mesinha desativada.' : 'Mesinha reativada.',
              )
            }
          >
            {mesinha.ativo ? 'Desativar' : 'Reativar'}
          </button>
          <button
            type="button"
            className="botao botao-perigo"
            onClick={() => {
              if (mesinha.arquivada) {
                void executar(
                  () => atualizarMesinha(mesinha.id, { arquivada: false }),
                  'Mesinha desarquivada.',
                );
              } else if (window.confirm('Arquivar esta mesinha? Ela sairá do cardápio público.')) {
                void executar(async () => {
                  await atualizarMesinha(mesinha.id, { arquivada: true, ativo: false });
                  navegar('/');
                }, 'Mesinha arquivada.');
              }
            }}
          >
            {mesinha.arquivada ? 'Desarquivar' : 'Arquivar'}
          </button>
        </div>
      </div>
    </div>
  );
}
