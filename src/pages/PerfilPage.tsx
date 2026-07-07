import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { arquivarConta, desarquivarConta, removerConta } from '../lib/api';
import {
  definirPreferenciaTema,
  usePreferenciaTema,
  type PreferenciaTema,
} from '../lib/tema';

const OPCOES_TEMA: { valor: PreferenciaTema; rotulo: string }[] = [
  { valor: 'sistema', rotulo: 'Sistema' },
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
];

export function PerfilPage() {
  const { perfil, atualizarPerfil, recarregarPerfil, sair, trocarSenha, trocarEmail } = useAuth();
  const preferenciaTema = usePreferenciaTema();
  const [nome, setNome] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [mensagem, setMensagem] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagemConta, setMensagemConta] = useState<string | null>(null);

  const [novoEmail, setNovoEmail] = useState('');
  const [mensagemEmail, setMensagemEmail] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null);
  const [trocandoEmail, setTrocandoEmail] = useState(false);

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [mensagemSenha, setMensagemSenha] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null);
  const [trocandoSenha, setTrocandoSenha] = useState(false);

  useEffect(() => {
    if (perfil) {
      setNome(perfil.nome);
      setChavePix(perfil.pix_key ?? '');
    }
  }, [perfil]);

  const categoria = perfil?.categorias;
  const descricaoLimites = categoria
    ? categoria.limite_mesinhas === null && categoria.limite_itens === null
      ? 'Sua conta não tem limite de mesinhas nem de itens.'
      : `Sua conta pode ter até ${categoria.limite_mesinhas ?? 'ilimitadas'} mesinhas e ${categoria.limite_itens ?? 'ilimitados'} itens.`
    : 'Os limites de mesinhas e itens dependem da categoria da conta.';

  async function aoSalvar(evento: FormEvent) {
    evento.preventDefault();
    setMensagem(null);
    setSalvando(true);
    try {
      await atualizarPerfil({ nome: nome.trim(), pix_key: chavePix.trim() || null });
      setMensagem({ tipo: 'sucesso', texto: 'Perfil atualizado com sucesso.' });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: erro instanceof Error ? erro.message : String(erro) });
    } finally {
      setSalvando(false);
    }
  }

  async function aoTrocarEmail(evento: FormEvent) {
    evento.preventDefault();
    setMensagemEmail(null);
    const email = novoEmail.trim();
    if (email.toLowerCase() === (perfil?.email ?? '').toLowerCase()) {
      setMensagemEmail({ tipo: 'erro', texto: 'Este já é o e-mail atual da conta.' });
      return;
    }
    setTrocandoEmail(true);
    try {
      await trocarEmail(email);
      setNovoEmail('');
      setMensagemEmail({
        tipo: 'sucesso',
        texto:
          `Enviamos links de confirmação para ${email} e para o e-mail atual. ` +
          'A troca só é efetivada depois da confirmação (confira também o spam).',
      });
    } catch (erro) {
      setMensagemEmail({ tipo: 'erro', texto: erro instanceof Error ? erro.message : String(erro) });
    } finally {
      setTrocandoEmail(false);
    }
  }

  async function aoTrocarSenha(evento: FormEvent) {
    evento.preventDefault();
    setMensagemSenha(null);
    if (novaSenha !== confirmacaoSenha) {
      setMensagemSenha({ tipo: 'erro', texto: 'As senhas digitadas não são iguais.' });
      return;
    }
    setTrocandoSenha(true);
    try {
      await trocarSenha(novaSenha);
      setNovaSenha('');
      setConfirmacaoSenha('');
      setMensagemSenha({ tipo: 'sucesso', texto: 'Senha alterada com sucesso.' });
    } catch (erro) {
      setMensagemSenha({ tipo: 'erro', texto: erro instanceof Error ? erro.message : String(erro) });
    } finally {
      setTrocandoSenha(false);
    }
  }

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Meu perfil</h1>
          <p className="subtitulo">
            {perfil?.email}
            {categoria && (
              <>
                {' · '}
                <span className="etiqueta etiqueta-primaria">{categoria.nome}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="cartao" style={{ maxWidth: 480 }}>
        <form className="formulario" onSubmit={(e) => void aoSalvar(e)}>
          <div className="campo">
            <label htmlFor="nome">Nome</label>
            <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="campo">
            <label htmlFor="pix">Chave PIX</label>
            <input
              id="pix"
              value={chavePix}
              onChange={(e) => setChavePix(e.target.value)}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
            />
            <p className="subtitulo" style={{ fontSize: '0.82rem' }}>
              Os pagamentos das suas vendas são recebidos nesta chave. Ela aparece no cardápio
              digital junto aos seus itens.
            </p>
          </div>

          {mensagem && (
            <p className={mensagem.tipo === 'erro' ? 'mensagem-erro' : 'mensagem-sucesso'}>
              {mensagem.texto}
            </p>
          )}

          <button type="submit" className="botao" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </form>
      </div>

      <div className="cartao" style={{ maxWidth: 480, marginTop: '1rem' }}>
        <h2>Segurança</h2>

        <form className="formulario" onSubmit={(e) => void aoTrocarEmail(e)}>
          <div className="campo">
            <label htmlFor="novo-email">Trocar e-mail</label>
            <input
              id="novo-email"
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              placeholder={perfil?.email}
              required
              autoComplete="email"
            />
            <p className="subtitulo" style={{ fontSize: '0.82rem' }}>
              Você recebe links de confirmação no e-mail novo e no atual; a troca só vale depois
              de confirmada.
            </p>
          </div>
          {mensagemEmail && (
            <p className={mensagemEmail.tipo === 'erro' ? 'mensagem-erro' : 'mensagem-sucesso'}>
              {mensagemEmail.texto}
            </p>
          )}
          <button type="submit" className="botao botao-secundario" disabled={trocandoEmail}>
            {trocandoEmail ? 'Enviando…' : 'Trocar e-mail'}
          </button>
        </form>

        <form
          className="formulario"
          style={{ marginTop: '1.25rem' }}
          onSubmit={(e) => void aoTrocarSenha(e)}
        >
          <div className="campo">
            <label htmlFor="nova-senha">Nova senha</label>
            <input
              id="nova-senha"
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="campo">
            <label htmlFor="confirmar-senha">Confirmar nova senha</label>
            <input
              id="confirmar-senha"
              type="password"
              value={confirmacaoSenha}
              onChange={(e) => setConfirmacaoSenha(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          {mensagemSenha && (
            <p className={mensagemSenha.tipo === 'erro' ? 'mensagem-erro' : 'mensagem-sucesso'}>
              {mensagemSenha.texto}
            </p>
          )}
          <button type="submit" className="botao botao-secundario" disabled={trocandoSenha}>
            {trocandoSenha ? 'Salvando…' : 'Trocar senha'}
          </button>
        </form>
      </div>

      <div className="cartao" style={{ maxWidth: 480, marginTop: '1rem' }}>
        <h2>Aparência</h2>
        <p className="subtitulo">
          Com a opção Sistema, o aplicativo acompanha o tema claro ou escuro do dispositivo. A
          escolha vale para este aparelho.
        </p>
        <div className="abas" role="tablist" aria-label="Tema do aplicativo">
          {OPCOES_TEMA.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              role="tab"
              aria-selected={preferenciaTema === opcao.valor}
              className={preferenciaTema === opcao.valor ? 'ativa' : undefined}
              onClick={() => definirPreferenciaTema(opcao.valor)}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="cartao" style={{ maxWidth: 480, marginTop: '1rem' }}>
        <h2>Conta</h2>
        {categoria && (
          <p className="subtitulo">
            Categoria da conta: <strong>{categoria.nome}</strong>.
          </p>
        )}
        <p className="subtitulo">
          {descricaoLimites} Arquivar a conta esconde suas mesinhas e itens do aplicativo, mas
          você continua vendo tudo e pode desarquivar. Remover a conta esconde tudo inclusive de
          você — sem volta.
        </p>
        {mensagemConta && <p className="mensagem-erro">{mensagemConta}</p>}
        <div className="linha-flex">
          {perfil?.status === 'arquivada' ? (
            <button
              type="button"
              className="botao botao-secundario"
              onClick={() => {
                setMensagemConta(null);
                desarquivarConta()
                  .then(recarregarPerfil)
                  .catch((erro: unknown) =>
                    setMensagemConta(erro instanceof Error ? erro.message : String(erro)),
                  );
              }}
            >
              Desarquivar conta
            </button>
          ) : (
            <button
              type="button"
              className="botao botao-fantasma"
              onClick={() => {
                if (
                  !window.confirm(
                    'Arquivar sua conta? Suas mesinhas, itens e listagens sairão do aplicativo e do cardápio público, mas você continuará vendo tudo e poderá desarquivar. Ao desarquivar, mesinhas e itens são reativados um a um.',
                  )
                ) {
                  return;
                }
                setMensagemConta(null);
                arquivarConta()
                  .then(recarregarPerfil)
                  .catch((erro: unknown) =>
                    setMensagemConta(erro instanceof Error ? erro.message : String(erro)),
                  );
              }}
            >
              Arquivar conta
            </button>
          )}
          <button
            type="button"
            className="botao botao-perigo"
            onClick={() => {
              const confirmado =
                window.confirm(
                  'Remover sua conta? Suas mesinhas, itens, listagens e histórico desaparecerão do aplicativo para todos — inclusive para você — e NÃO poderão ser recuperados. Você poderá criar uma conta nova (com este ou outro e-mail), mas ela começará vazia.',
                ) && window.confirm('Tem certeza? Esta ação não pode ser desfeita.');
              if (!confirmado) return;
              setMensagemConta(null);
              removerConta()
                .then(() => sair())
                .catch((erro: unknown) =>
                  setMensagemConta(erro instanceof Error ? erro.message : String(erro)),
                );
            }}
          >
            Remover conta
          </button>
        </div>
      </div>
    </>
  );
}
