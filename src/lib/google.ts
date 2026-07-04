// Auxiliares do fluxo OAuth do Google (authorization code) para a
// sincronização de planilhas. O client_id é público; o client secret e o
// refresh token ficam no backend (RNF-SEC).

// drive.file é um escopo não sensível (dispensa verificação do Google): dá
// acesso apenas aos arquivos que o usuário escolher pelo Google Picker. Por
// isso a planilha é selecionada no Picker, não por ID colado à mão.
const ESCOPOS = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
];

const CHAVE_ESTADO = 'google_oauth_estado';
const CHAVE_RETORNO = 'google_oauth_retorno';

/** Precisa bater exatamente com um Redirect URI cadastrado no Google Cloud. */
export function redirectUri(): string {
  return `${window.location.origin}/google/callback`;
}

function clientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!id) {
    throw new Error('Configure VITE_GOOGLE_CLIENT_ID no .env.local para conectar o Google.');
  }
  return id;
}

/**
 * Redireciona o navegador ao consentimento do Google. `caminhoRetorno` é para
 * onde voltamos depois de conectar (ex.: a página da mesinha). Guarda um
 * `state` aleatório em sessionStorage para validação anti-CSRF no callback.
 */
export function iniciarConexaoGoogle(caminhoRetorno: string): void {
  const estado = crypto.randomUUID();
  sessionStorage.setItem(CHAVE_ESTADO, estado);
  sessionStorage.setItem(CHAVE_RETORNO, caminhoRetorno);

  const parametros = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: ESCOPOS.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: estado,
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${parametros.toString()}`;
}

/** Valida o `state` recebido no callback contra o guardado antes do redirect. */
export function validarEstado(estadoRecebido: string | null): boolean {
  const esperado = sessionStorage.getItem(CHAVE_ESTADO);
  sessionStorage.removeItem(CHAVE_ESTADO);
  return !!esperado && esperado === estadoRecebido;
}

export function consumirCaminhoRetorno(): string {
  const retorno = sessionStorage.getItem(CHAVE_RETORNO) ?? '/';
  sessionStorage.removeItem(CHAVE_RETORNO);
  return retorno;
}
