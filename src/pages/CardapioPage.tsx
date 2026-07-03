// Cardápio digital público (RF-MENU-01/02/04): acessível sem login pelo QR
// code da mesinha; o pagamento é feito no PIX do vendedor de cada item.

import { useEffect, useRef, useState } from 'react';
import { obterCardapio } from '../lib/api';
import { gerarPayloadPix } from '../lib/pix';
import { QrCodeSvg } from '../components/QrCodeSvg';
import { formatarMoeda } from '../lib/format';
import type { CardapioItem, CardapioMesinha } from '../types';

export function CardapioPage({ mesinhaId }: { mesinhaId: string }) {
  const [mesinha, setMesinha] = useState<CardapioMesinha | null>(null);
  const [itens, setItens] = useState<CardapioItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [itemPix, setItemPix] = useState<CardapioItem | null>(null);
  const dialogoRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    obterCardapio(mesinhaId)
      .then((dados) => {
        setMesinha(dados.mesinha);
        setItens(dados.itens);
      })
      .catch(() => setErro('Cardápio não encontrado ou mesinha inativa.'));
  }, [mesinhaId]);

  useEffect(() => {
    if (itemPix) {
      dialogoRef.current?.showModal();
    } else {
      dialogoRef.current?.close();
    }
  }, [itemPix]);

  if (erro) {
    return (
      <div className="cardapio-publico">
        <p className="mensagem-erro">{erro}</p>
      </div>
    );
  }
  if (!mesinha) {
    return (
      <div className="cardapio-publico">
        <p className="subtitulo">Carregando cardápio…</p>
      </div>
    );
  }

  const categorias = [...new Set(itens.map((item) => item.categoria))];
  const payloadPix =
    itemPix?.vendedor_pix &&
    gerarPayloadPix({
      chave: itemPix.vendedor_pix,
      nomeRecebedor: itemPix.vendedor_nome,
      valor: itemPix.preco_atual,
    });

  return (
    <div className="cardapio-publico">
      <header className="cardapio-cabecalho">
        <h1>{mesinha.nome}</h1>
        {mesinha.descricao && <p className="subtitulo">{mesinha.descricao}</p>}
        <button type="button" className="botao botao-secundario nao-imprimir" onClick={() => window.print()}>
          Imprimir cardápio
        </button>
      </header>

      {itens.length === 0 && (
        <p className="subtitulo" style={{ textAlign: 'center' }}>
          Nenhum item disponível no momento.
        </p>
      )}

      {categorias.map((categoria) => (
        <section key={categoria}>
          <h2 className="cardapio-categoria">{categoria}</h2>
          {itens
            .filter((item) => item.categoria === categoria)
            .map((item) => (
              <article
                key={item.listagem_id}
                className={`cardapio-item ${item.disponivel ? '' : 'indisponivel'}`.trim()}
              >
                <div>
                  <strong>{item.item_nome}</strong>
                  {!item.disponivel && <span className="etiqueta etiqueta-alerta" style={{ marginLeft: 8 }}>esgotado</span>}
                  {item.item_descricao && (
                    <p className="subtitulo" style={{ margin: '0.15rem 0 0', fontSize: '0.85rem' }}>
                      {item.item_descricao}
                    </p>
                  )}
                  <p className="subtitulo" style={{ margin: '0.15rem 0 0', fontSize: '0.8rem' }}>
                    Vendido por {item.vendedor_nome}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="preco">{formatarMoeda(item.preco_atual)}</div>
                  {item.vendedor_pix && item.disponivel && (
                    <button
                      type="button"
                      className="botao botao-pequeno nao-imprimir"
                      style={{ marginTop: '0.3rem' }}
                      onClick={() => setItemPix(item)}
                    >
                      Pagar com PIX
                    </button>
                  )}
                </div>
              </article>
            ))}
        </section>
      ))}

      <dialog ref={dialogoRef} className="dialogo-pix" onClose={() => setItemPix(null)}>
        {itemPix && payloadPix && (
          <>
            <h2>{itemPix.item_nome}</h2>
            <p className="subtitulo">
              {formatarMoeda(itemPix.preco_atual)} para {itemPix.vendedor_nome}
            </p>
            <QrCodeSvg valor={payloadPix} rotulo="QR code de pagamento PIX" largura={240} />
            <p className="pix-copia-cola">{payloadPix}</p>
            <div className="linha-flex" style={{ justifyContent: 'center' }}>
              <button
                type="button"
                className="botao botao-secundario botao-pequeno"
                onClick={() => void navigator.clipboard.writeText(payloadPix)}
              >
                Copiar código
              </button>
              <button
                type="button"
                className="botao botao-fantasma botao-pequeno"
                onClick={() => setItemPix(null)}
              >
                Fechar
              </button>
            </div>
            <p className="subtitulo" style={{ fontSize: '0.78rem', marginTop: '0.75rem' }}>
              Após pagar, avise o vendedor para confirmar o recebimento.
            </p>
          </>
        )}
      </dialog>

      <footer style={{ textAlign: 'center', marginTop: '2rem' }} className="nao-imprimir">
        <p className="subtitulo" style={{ fontSize: '0.8rem' }}>
          Cardápio digital gerado pelo UniMesinha.
        </p>
      </footer>
    </div>
  );
}
