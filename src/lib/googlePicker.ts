// Google Picker: seleção da planilha para o escopo drive.file. É o único ponto
// em que carregamos script externo do Google (apis.google.com) — o Picker não
// tem alternativa via fetch. O access token vem do backend (não expomos o
// refresh token nem o client secret).

interface PlanilhaEscolhida {
  id: string;
  nome: string;
}

// deno-lint-ignore no-explicit-any
type Gapi = any;

declare global {
  interface Window {
    gapi?: Gapi;
    google?: Gapi;
  }
}

let scriptCarregado: Promise<void> | null = null;

function carregarScriptGapi(): Promise<void> {
  if (window.gapi?.load) return Promise.resolve();
  if (scriptCarregado) return scriptCarregado;
  scriptCarregado = new Promise((resolver, rejeitar) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => resolver();
    script.onerror = () => rejeitar(new Error('Falha ao carregar o Google Picker.'));
    document.head.appendChild(script);
  });
  return scriptCarregado;
}

function carregarModuloPicker(): Promise<void> {
  return new Promise((resolver) => {
    window.gapi.load('picker', { callback: () => resolver() });
  });
}

function apiKey(): string {
  const chave = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
  if (!chave) {
    throw new Error('Configure VITE_GOOGLE_API_KEY no .env.local para usar o Google Picker.');
  }
  return chave;
}

/**
 * Abre o Google Picker restrito a planilhas. Resolve com o arquivo escolhido ou
 * `null` se o usuário cancelar. O `accessToken` (escopo drive.file) autoriza o
 * app a acessar exatamente o arquivo selecionado.
 */
export async function escolherPlanilha(accessToken: string): Promise<PlanilhaEscolhida | null> {
  await carregarScriptGapi();
  await carregarModuloPicker();
  const picker = window.google.picker;

  return new Promise((resolver, rejeitar) => {
    try {
      // A busca do próprio Picker alcança qualquer planilha acessível ao usuário
      // (próprias ou compartilhadas), o que atende ao caso da planilha da org.
      const visao = new picker.DocsView(picker.ViewId.SPREADSHEETS);

      const instancia = new picker.PickerBuilder()
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey())
        .setTitle('Escolha a planilha da organização')
        .addView(visao)
        .setCallback((dados: Gapi) => {
          if (dados.action === picker.Action.PICKED) {
            const doc = dados.docs?.[0];
            resolver(doc ? { id: doc.id, nome: doc.name } : null);
          } else if (dados.action === picker.Action.CANCEL) {
            resolver(null);
          }
        })
        .build();
      instancia.setVisible(true);
    } catch (erro) {
      rejeitar(erro instanceof Error ? erro : new Error(String(erro)));
    }
  });
}
