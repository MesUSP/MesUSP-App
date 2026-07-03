import { useMemo } from 'react';
import { gerarQrCode, qrParaCaminhoSvg } from '../lib/qrcode';

interface Propriedades {
  valor: string;
  rotulo?: string;
  /** Largura em pixels CSS (o SVG é vetorial e imprime nítido em qualquer tamanho). */
  largura?: number;
}

export function QrCodeSvg({ valor, rotulo, largura = 220 }: Propriedades) {
  const codigo = useMemo(() => {
    try {
      const qr = gerarQrCode(valor);
      return { tamanho: qr.tamanho, caminho: qrParaCaminhoSvg(qr), erro: null };
    } catch (erro) {
      return { tamanho: 0, caminho: '', erro: erro instanceof Error ? erro.message : String(erro) };
    }
  }, [valor]);

  if (codigo.erro) {
    return <p className="mensagem-erro">Não foi possível gerar o QR code: {codigo.erro}</p>;
  }

  // Zona de silêncio de 4 módulos exigida pela especificação.
  const margem = 4;
  const total = codigo.tamanho + margem * 2;

  return (
    <svg
      role="img"
      aria-label={rotulo ?? 'QR code'}
      viewBox={`${-margem} ${-margem} ${total} ${total}`}
      width={largura}
      height={largura}
      shapeRendering="crispEdges"
    >
      <rect x={-margem} y={-margem} width={total} height={total} fill="#ffffff" />
      <path d={codigo.caminho} fill="#000000" />
    </svg>
  );
}
