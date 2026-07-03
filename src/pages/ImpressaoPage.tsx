// Folha A4 imprimível com todos os produtos do usuário, preços e o QR code
// do PIX dele (RF-MENU-05).

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { gerarPayloadPix } from '../lib/pix';
import { QrCodeSvg } from '../components/QrCodeSvg';
import { formatarMoeda } from '../lib/format';
import { Link } from '../router';
import type { Listagem } from '../types';

export function ImpressaoPage() {
  const { sessao, perfil } = useAuth();
  const [listagens, setListagens] = useState<Listagem[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!sessao) return;
    supabase
      .from('listagens')
      .select('*, itens(nome, categoria, descricao), mesinhas(nome, tipo)')
      .eq('dono_id', sessao.user.id)
      .eq('status', 'ativa')
      .order('criado_em')
      .then(({ data, error }) => {
        if (error) {
          setErro(error.message);
        } else {
          setListagens((data ?? []) as Listagem[]);
        }
      });
  }, [sessao]);

  if (erro) return <p className="mensagem-erro">{erro}</p>;
  if (!perfil || listagens === null) return <p className="subtitulo">Carregando…</p>;

  const payloadPix = perfil.pix_key
    ? gerarPayloadPix({ chave: perfil.pix_key, nomeRecebedor: perfil.nome })
    : null;

  return (
    <>
      <div className="linha-flex nao-imprimir" style={{ marginBottom: '1rem' }}>
        <div>
          <h1>Folha de impressão</h1>
          <p className="subtitulo">
            Todos os seus produtos ativos, com preços e o QR code do seu PIX, em uma folha A4.
          </p>
        </div>
        <span className="espacador" />
        <button type="button" className="botao" onClick={() => window.print()}>
          Imprimir
        </button>
      </div>

      <div className="folha-a4">
        <h1>{perfil.nome}</h1>
        <p className="subtitulo" style={{ textAlign: 'center' }}>
          Tabela de preços
        </p>

        {listagens.length === 0 ? (
          <p className="subtitulo" style={{ textAlign: 'center' }}>
            Nenhum produto ativo. Liste seus itens em uma mesinha para incluí-los aqui.{' '}
            <Link para="/itens" className="nao-imprimir">
              Ir para Meus itens
            </Link>
          </p>
        ) : (
          listagens.map((listagem) => (
            <div key={listagem.id} className="produto-impresso">
              <div>
                <strong>{listagem.itens?.nome}</strong>
                <span className="subtitulo" style={{ marginLeft: 8, fontSize: '0.85rem' }}>
                  {listagem.mesinhas?.nome}
                </span>
              </div>
              <strong>{formatarMoeda(listagem.preco_atual)}</strong>
            </div>
          ))
        )}

        {payloadPix ? (
          <div className="qr-impressao" style={{ marginTop: '1.5rem' }}>
            <h2>Pague com PIX</h2>
            <QrCodeSvg valor={payloadPix} rotulo="QR code do PIX" largura={300} />
            <p className="subtitulo">Chave: {perfil.pix_key}</p>
            <p className="subtitulo">O valor é digitado na hora do pagamento.</p>
          </div>
        ) : (
          <p className="mensagem-erro nao-imprimir" style={{ marginTop: '1.5rem' }}>
            Cadastre sua chave PIX no <Link para="/perfil">perfil</Link> para incluir o QR code de
            pagamento nesta folha.
          </p>
        )}
      </div>
    </>
  );
}
