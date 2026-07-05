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
import { DesenvolvedorPage } from './pages/DesenvolvedorPage';

interface Rota {
  padrao: string;
  publica?: boolean;
  /** Restrita à categoria desenvolvedor (o backend barra as demais; aqui é UX). */
  somenteDesenvolvedor?: boolean;
  render: (parametros: Record<string, string>) => ReactNode;
}

const ROTAS: Rota[] = [
  { padrao: '/', render: () => <MesinhasPage /> },
  { padrao: '/perfil', render: () => <PerfilPage /> },
  { padrao: '/google/callback', render: () => <GoogleCallbackPage /> },
  { padrao: '/itens', render: () => <ItensPage /> },
  { padrao: '/desenvolvedor', somenteDesenvolvedor: true, render: () => <DesenvolvedorPage /> },
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
  const { sessao, perfil, carregando, sair } = useAuth();

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

    // Rotas exclusivas de desenvolvedor não existem para as demais categorias.
    if (rota.somenteDesenvolvedor) {
      if (!perfil) {
        return (
          <div className="pagina-centralizada">
            <p className="subtitulo">Carregando…</p>
          </div>
        );
      }
      if (perfil.categoria_id !== 'desenvolvedor') {
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
    }

    // Conta removida: os dados sumiram do app para o próprio dono (soft delete).
    if (perfil?.status === 'removida') {
      return (
        <div className="pagina-centralizada">
          <div className="cartao" style={{ textAlign: 'center', maxWidth: 420 }}>
            <h1>Conta removida</h1>
            <p className="subtitulo">
              Esta conta foi removida e os dados dela não estão mais disponíveis no aplicativo.
            </p>
            <button type="button" className="botao" onClick={() => void sair()}>
              Sair
            </button>
          </div>
        </div>
      );
    }

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
