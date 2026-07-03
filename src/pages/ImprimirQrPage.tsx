// Página imprimível com o QR code do cardápio da mesinha (RF-MENU-03).

import { useEffect, useState } from 'react';
import { obterMesinha } from '../lib/api';
import { QrCodeSvg } from '../components/QrCodeSvg';
import { Link } from '../router';
import type { Mesinha } from '../types';

export function ImprimirQrPage({ id }: { id: string }) {
  const [mesinha, setMesinha] = useState<Mesinha | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    obterMesinha(id)
      .then(setMesinha)
      .catch((excecao) => setErro(excecao instanceof Error ? excecao.message : String(excecao)));
  }, [id]);

  if (erro) return <p className="mensagem-erro">{erro}</p>;
  if (!mesinha) return <p className="subtitulo">Carregando…</p>;

  const url = `${window.location.origin}/cardapio/${mesinha.id}`;

  return (
    <div className="folha-a4">
      <div className="linha-flex nao-imprimir" style={{ marginBottom: '1rem' }}>
        <Link para={`/mesinhas/${mesinha.id}`} className="botao botao-fantasma botao-pequeno">
          ← Voltar
        </Link>
        <span className="espacador" />
        <button type="button" className="botao" onClick={() => window.print()}>
          Imprimir
        </button>
      </div>

      <div className="qr-impressao">
        <h1>{mesinha.nome}</h1>
        <p style={{ fontSize: '1.2rem' }}>Escaneie para ver o cardápio e pagar via PIX</p>
        <QrCodeSvg valor={url} rotulo={`QR code do cardápio da ${mesinha.nome}`} largura={420} />
        <p className="subtitulo" style={{ wordBreak: 'break-all' }}>{url}</p>
      </div>
    </div>
  );
}
