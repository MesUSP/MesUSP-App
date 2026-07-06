import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useRoteador } from '../router';
import { useAuth } from '../context/AuthContext';
import { desarquivarConta } from '../lib/api';

const LINKS = [
  { para: '/', rotulo: 'Mesinhas' },
  { para: '/itens', rotulo: 'Meus itens' },
  { para: '/relatorios', rotulo: 'Relatórios' },
  { para: '/impressao', rotulo: 'Impressão' },
  { para: '/perfil', rotulo: 'Perfil' },
];

// Aba exclusiva da categoria desenvolvedor (o backend barra as demais contas;
// esconder o link é só para a função não aparecer às outras categorias).
const LINK_DESENVOLVEDOR = { para: '/desenvolvedor', rotulo: 'Desenvolvedor' };

export function Layout({ children }: { children: ReactNode }) {
  const { caminho } = useRoteador();
  const { perfil, sair, recarregarPerfil } = useAuth();
  const navegacaoRef = useRef<HTMLElement>(null);
  const links =
    perfil?.categoria_id === 'desenvolvedor' ? [...LINKS, LINK_DESENVOLVEDOR] : LINKS;

  // No mobile a navegação é uma linha única rolável: mantém o link da página
  // atual à vista. No desktop (sem rolagem) não tem efeito.
  useEffect(() => {
    navegacaoRef.current
      ?.querySelector('.ativo')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [caminho]);

  return (
    <div className="aplicacao">
      {perfil?.status === 'arquivada' && (
        <div className="cartao nao-imprimir" style={{ margin: '0.75rem', textAlign: 'center' }}>
          <p style={{ margin: 0 }}>
            <strong>Conta arquivada.</strong> Suas mesinhas e itens não aparecem no aplicativo nem
            no cardápio público.{' '}
            <button
              type="button"
              className="botao botao-secundario botao-pequeno"
              onClick={() => void desarquivarConta().then(recarregarPerfil)}
            >
              Desarquivar conta
            </button>
          </p>
        </div>
      )}
      <header className="cabecalho nao-imprimir">
        <div className="cabecalho-conteudo">
          <Link para="/" className="marca">
            <span aria-hidden="true">▦</span> UniMesinha
          </Link>
          <nav className="navegacao" aria-label="Navegação principal" ref={navegacaoRef}>
            {links.map((link) => (
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
