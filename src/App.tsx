import type { ReactNode } from 'react';
import { corresponderRota, useRoteador } from './router';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { PerfilPage } from './pages/PerfilPage';
import { MesinhasPage } from './pages/MesinhasPage';
import { MesinhaPage } from './pages/MesinhaPage';
import { ItensPage } from './pages/ItensPage';
import { ListagemPage } from './pages/ListagemPage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import { CardapioPage } from './pages/CardapioPage';
import { ImprimirQrPage } from './pages/ImprimirQrPage';
import { ImpressaoPage } from './pages/ImpressaoPage';
import { GoogleCallbackPage } from './pages/GoogleCallbackPage';

interface Rota {
  padrao: string;
  publica?: boolean;
  render: (parametros: Record<string, string>) => ReactNode;
}

const ROTAS: Rota[] = [
  { padrao: '/', render: () => <MesinhasPage /> },
  { padrao: '/perfil', render: () => <PerfilPage /> },
  { padrao: '/google/callback', render: () => <GoogleCallbackPage /> },
  { padrao: '/itens', render: () => <ItensPage /> },
  { padrao: '/relatorios', render: () => <RelatoriosPage /> },
  { padrao: '/impressao', render: () => <ImpressaoPage /> },
  { padrao: '/mesinhas/:id', render: (p) => <MesinhaPage id={p.id} /> },
  { padrao: '/mesinhas/:id/imprimir-qr', render: (p) => <ImprimirQrPage id={p.id} /> },
  { padrao: '/listagens/:id', render: (p) => <ListagemPage id={p.id} /> },
  {
    padrao: '/cardapio/:mesinhaId',
    publica: true,
    render: (p) => <CardapioPage mesinhaId={p.mesinhaId} />,
  },
];

export function App() {
  const { caminho } = useRoteador();
  const { sessao, carregando } = useAuth();

  for (const rota of ROTAS) {
    const parametros = corresponderRota(rota.padrao, caminho);
    if (!parametros) continue;

    // O cardápio digital é acessível ao consumidor final sem login.
    if (rota.publica) return <>{rota.render(parametros)}</>;

    if (carregando) {
      return (
        <div className="pagina-centralizada">
          <p className="subtitulo">Carregando…</p>
        </div>
      );
    }
    if (!sessao) return <LoginPage />;
    return <Layout>{rota.render(parametros)}</Layout>;
  }

  return (
    <div className="pagina-centralizada">
      <div className="cartao" style={{ textAlign: 'center' }}>
        <h1>Página não encontrada</h1>
        <p className="subtitulo">O endereço {caminho} não existe.</p>
        <a href="/">Voltar ao início</a>
      </div>
    </div>
  );
}
