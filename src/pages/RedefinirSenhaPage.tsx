// Tela exibida quando o usuário chega pelo link de "esqueci minha senha":
// a sessão nasce em modo de recuperação (evento PASSWORD_RECOVERY) e o App
// mostra esta página até a senha ser redefinida.

import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

export function RedefinirSenhaPage() {
  const { trocarSenha, sair } = useAuth();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (senha !== confirmacao) {
      setErro('As senhas digitadas não são iguais.');
      return;
    }
    setEnviando(true);
    try {
      await trocarSenha(senha);
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina-centralizada">
      <div className="cartao cartao-autenticacao">
        <h1 style={{ textAlign: 'center' }}>Redefinir senha</h1>
        <p className="subtitulo" style={{ textAlign: 'center', marginBottom: '1rem' }}>
          Escolha uma senha nova para a sua conta.
        </p>

        <form className="formulario" onSubmit={(e) => void aoEnviar(e)}>
          <div className="campo">
            <label htmlFor="nova-senha">Nova senha</label>
            <input
              id="nova-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
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
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          {erro && <p className="mensagem-erro">{erro}</p>}

          <button type="submit" className="botao" disabled={enviando}>
            {enviando ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </form>

        <button
          type="button"
          className="botao botao-fantasma botao-pequeno"
          style={{ marginTop: '0.75rem', width: '100%' }}
          onClick={() => void sair()}
        >
          Cancelar e sair
        </button>
      </div>
    </div>
  );
}
