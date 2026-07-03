const PADRAO_ID_PLANILHA = /^[A-Za-z0-9_-]{20,}$/;

export function extrairIdPlanilha(valor: string): string {
  const entrada = valor.trim();

  // Mantém compatibilidade com IDs já cadastrados antes de a interface aceitar links.
  if (PADRAO_ID_PLANILHA.test(entrada)) return entrada;

  let url: URL;
  try {
    url = new URL(entrada);
  } catch {
    throw new Error('Cole um link válido do Google Planilhas.');
  }

  if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com') {
    throw new Error('O link deve ser de uma planilha em docs.google.com.');
  }

  const resultado = url.pathname.match(
    /^\/spreadsheets(?:\/u\/\d+)?\/d\/([A-Za-z0-9_-]+)(?:\/|$)/,
  );
  const id = resultado?.[1];
  if (!id || !PADRAO_ID_PLANILHA.test(id)) {
    throw new Error('Não foi possível identificar a planilha nesse link.');
  }

  return id;
}

export function montarLinkPlanilha(id: string | null): string {
  return id ? `https://docs.google.com/spreadsheets/d/${id}/edit` : '';
}
