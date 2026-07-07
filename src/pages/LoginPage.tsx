import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { entrar, cadastrar, recuperarSenha } = useAuth();
  const [modo, setModo] = useState<'entrar' | 'cadastrar' | 'recuperar'>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function mudarModo(novo: 'entrar' | 'cadastrar' | 'recuperar') {
    setModo(novo);
    setErro(null);
    setAviso(null);
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAviso(null);
    setEnviando(true);
    try {
      if (modo === 'entrar') {
        await entrar(email, senha);
      } else if (modo === 'recuperar') {
        await recuperarSenha(email);
        setModo('entrar');
        setAviso(
          `Se ${email} estiver cadastrado, enviamos um e-mail com instruções para ` +
            'redefinir a senha. Abra o link (confira também o spam) para escolher uma senha nova.',
        );
      } else {
        const precisaConfirmar = await cadastrar(nome.trim(), email, senha);
        if (precisaConfirmar) {
          setModo('entrar');
          setSenha('');
          setAviso(
            `Conta criada! Enviamos um link de confirmação para ${email}. ` +
              'Abra o e-mail (confira também o spam) e confirme a conta antes de entrar.',
          );
        }
      }
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina-centralizada">
      <div className="cartao cartao-autenticacao">
        <h1 style={{ textAlign: 'center' }}>
          <span aria-hidden="true">▦</span> UniMesinha
        </h1>
        <p className="subtitulo" style={{ textAlign: 'center', marginBottom: '1rem' }}>
          Controle de mesinhas universitárias
        </p>

        {modo !== 'recuperar' && (
          <div className="abas" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'entrar'}
              className={modo === 'entrar' ? 'ativa' : undefined}
              onClick={() => mudarModo('entrar')}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'cadastrar'}
              className={modo === 'cadastrar' ? 'ativa' : undefined}
              onClick={() => mudarModo('cadastrar')}
            >
              Criar conta
            </button>
          </div>
        )}

        {modo === 'recuperar' && (
          <p className="subtitulo" style={{ marginBottom: '1rem' }}>
            Informe o e-mail da sua conta. Enviaremos um link para você escolher uma senha nova
            sem precisar estar logado.
          </p>
        )}

        <form className="formulario" onSubmit={(e) => void aoEnviar(e)}>
          {modo === 'cadastrar' && (
            <div className="campo">
              <label htmlFor="nome">Nome</label>
              <input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}
          <div className="campo">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          {modo !== 'recuperar' && (
            <div className="campo">
              <label htmlFor="senha">Senha</label>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
                autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              />
            </div>
          )}

          {erro && <p className="mensagem-erro">{erro}</p>}
          {aviso && <p className="mensagem-sucesso">{aviso}</p>}

          <button type="submit" className="botao" disabled={enviando}>
            {enviando
              ? 'Aguarde…'
              : modo === 'entrar'
                ? 'Entrar'
                : modo === 'recuperar'
                  ? 'Enviar instruções'
                  : 'Criar conta'}
          </button>
        </form>

        {modo === 'entrar' && (
          <button
            type="button"
            className="botao botao-fantasma botao-pequeno"
            style={{ marginTop: '0.75rem', width: '100%' }}
            onClick={() => mudarModo('recuperar')}
          >
            Esqueci minha senha
          </button>
        )}
        {modo === 'recuperar' && (
          <button
            type="button"
            className="botao botao-fantasma botao-pequeno"
            style={{ marginTop: '0.75rem', width: '100%' }}
            onClick={() => mudarModo('entrar')}
          >
            Voltar para o login
          </button>
        )}

        <p className="subtitulo" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
          Qualquer e-mail pode ser usado — o cadastro não é restrito a contas @usp.br.
        </p>
      </div>
    </div>
  );
}
