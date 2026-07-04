import { useEffect, useRef, useState } from 'react';
import { useRoteador } from '../router';
import { conectarGoogle } from '../lib/api';
import { consumirCaminhoRetorno, redirectUri, validarEstado } from '../lib/google';

// Rota de retorno do consentimento do Google. Lê o `code`, valida o `state` e
// entrega o code ao backend, que o troca pelo refresh token.
export function GoogleCallbackPage() {
  const { navegar } = useRoteador();
  const [erro, setErro] = useState<string | null>(null);
  const processado = useRef(false);

  useEffect(() => {
    if (processado.current) return;
    processado.current = true;

    const parametros = new URLSearchParams(window.location.search);
    const code = parametros.get('code');
    const estado = parametros.get('state');
    const erroGoogle = parametros.get('error');
    const retorno = consumirCaminhoRetorno();

    async function concluir() {
      if (erroGoogle) {
        setErro(`O Google recusou a autorização: ${erroGoogle}.`);
        return;
      }
      if (!validarEstado(estado)) {
        setErro('Estado de segurança inválido. Refaça a conexão.');
        return;
      }
      if (!code) {
        setErro('O Google não retornou o código de autorização.');
        return;
      }
      try {
        await conectarGoogle(code, redirectUri());
        navegar(retorno, true);
      } catch (excecao) {
        setErro(excecao instanceof Error ? excecao.message : String(excecao));
      }
    }

    void concluir();
  }, [navegar]);

  return (
    <div className="pagina-centralizada">
      <div className="cartao" style={{ textAlign: 'center', maxWidth: '28rem' }}>
        {erro ? (
          <>
            <h1>Não foi possível conectar</h1>
            <p className="mensagem-erro">{erro}</p>
            <a href="/">Voltar ao início</a>
          </>
        ) : (
          <>
            <h1>Conectando ao Google…</h1>
            <p className="subtitulo">Guardando a autorização com segurança.</p>
          </>
        )}
      </div>
    </div>
  );
}
