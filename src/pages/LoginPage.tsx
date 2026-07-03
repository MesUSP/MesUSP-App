import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { entrar, cadastrar } = useAuth();
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      if (modo === 'entrar') {
        await entrar(email, senha);
      } else {
        await cadastrar(nome.trim(), email, senha);
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

        <div className="abas" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'entrar'}
            className={modo === 'entrar' ? 'ativa' : undefined}
            onClick={() => setModo('entrar')}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'cadastrar'}
            className={modo === 'cadastrar' ? 'ativa' : undefined}
            onClick={() => setModo('cadastrar')}
          >
            Criar conta
          </button>
        </div>

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

          {erro && <p className="mensagem-erro">{erro}</p>}

          <button type="submit" className="botao" disabled={enviando}>
            {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <p className="subtitulo" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
          Qualquer e-mail pode ser usado — o cadastro não é restrito a contas @usp.br.
        </p>
      </div>
    </div>
  );
}
