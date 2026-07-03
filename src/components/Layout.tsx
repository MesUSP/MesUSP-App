import type { ReactNode } from 'react';
import { Link, useRoteador } from '../router';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  { para: '/', rotulo: 'Mesinhas' },
  { para: '/itens', rotulo: 'Meus itens' },
  { para: '/relatorios', rotulo: 'Relatórios' },
  { para: '/impressao', rotulo: 'Impressão' },
  { para: '/perfil', rotulo: 'Perfil' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { caminho } = useRoteador();
  const { perfil, sair } = useAuth();

  return (
    <div className="aplicacao">
      <header className="cabecalho nao-imprimir">
        <div className="cabecalho-conteudo">
          <Link para="/" className="marca">
            <span aria-hidden="true">▦</span> UniMesinha
          </Link>
          <nav className="navegacao" aria-label="Navegação principal">
            {LINKS.map((link) => (
              <Link
                key={link.para}
                para={link.para}
                className={caminho === link.para ? 'ativo' : undefined}
              >
                {link.rotulo}
              </Link>
            ))}
          </nav>
          <div className="cabecalho-usuario">
            <span className="nome-usuario">{perfil?.nome}</span>
            <button type="button" className="botao botao-fantasma" onClick={() => void sair()}>
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="conteudo">{children}</main>
    </div>
  );
}
