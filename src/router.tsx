// Roteador próprio baseado em Context e History API (RNF-ARCH-02 proíbe
// bibliotecas externas de roteamento).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react';

interface EstadoRoteador {
  caminho: string;
  navegar: (destino: string, substituir?: boolean) => void;
}

const RoteadorContext = createContext<EstadoRoteador | null>(null);

export function RoteadorProvider({ children }: { children: ReactNode }) {
  const [caminho, setCaminho] = useState(window.location.pathname);

  useEffect(() => {
    const aoVoltar = () => setCaminho(window.location.pathname);
    window.addEventListener('popstate', aoVoltar);
    return () => window.removeEventListener('popstate', aoVoltar);
  }, []);

  const navegar = useCallback((destino: string, substituir = false) => {
    if (substituir) {
      window.history.replaceState(null, '', destino);
    } else {
      window.history.pushState(null, '', destino);
    }
    setCaminho(new URL(destino, window.location.origin).pathname);
    window.scrollTo(0, 0);
  }, []);

  const valor = useMemo(() => ({ caminho, navegar }), [caminho, navegar]);
  return <RoteadorContext.Provider value={valor}>{children}</RoteadorContext.Provider>;
}

export function useRoteador(): EstadoRoteador {
  const contexto = useContext(RoteadorContext);
  if (!contexto) throw new Error('useRoteador deve ser usado dentro de RoteadorProvider.');
  return contexto;
}

/** Compara um padrão como "/mesinhas/:id" com o caminho atual. */
export function corresponderRota(padrao: string, caminho: string): Record<string, string> | null {
  const segmentosPadrao = padrao.split('/').filter(Boolean);
  const segmentosCaminho = caminho.split('/').filter(Boolean);
  if (segmentosPadrao.length !== segmentosCaminho.length) return null;

  const parametros: Record<string, string> = {};
  for (let i = 0; i < segmentosPadrao.length; i++) {
    const esperado = segmentosPadrao[i];
    const recebido = segmentosCaminho[i];
    if (esperado.startsWith(':')) {
      parametros[esperado.slice(1)] = decodeURIComponent(recebido);
    } else if (esperado !== recebido) {
      return null;
    }
  }
  return parametros;
}

interface PropriedadesLink extends AnchorHTMLAttributes<HTMLAnchorElement> {
  para: string;
  children: ReactNode;
}

export function Link({ para, children, onClick, ...restante }: PropriedadesLink) {
  const { navegar } = useRoteador();
  return (
    <a
      href={para}
      onClick={(evento) => {
        onClick?.(evento);
        if (evento.defaultPrevented || evento.metaKey || evento.ctrlKey || evento.shiftKey) return;
        evento.preventDefault();
        navegar(para);
      }}
      {...restante}
    >
      {children}
    </a>
  );
}
