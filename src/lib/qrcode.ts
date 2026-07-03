// Geração de QR Code usando a biblioteca `qrcode` (node-qrcode), a mais
// testada do ecossistema. Este módulo é um adaptador fino: expõe a matriz de
// módulos e o caminho SVG no formato que o componente QrCodeSvg consome.
//
// Histórico: a primeira versão trazia um codificador ISO 18004 próprio, mas
// os códigos gerados não eram reconhecidos por leitores reais; a troca pela
// biblioteca foi autorizada como exceção ao RNF-ARCH-02.

import { create as criarQr, type QRCodeErrorCorrectionLevel } from 'qrcode';

export type NivelCorrecao = 'L' | 'M' | 'Q' | 'H';

export interface QrCode {
  tamanho: number;
  /** modulos[y][x] === true indica módulo escuro. */
  modulos: boolean[][];
}

export function gerarQrCode(texto: string, nivel: NivelCorrecao = 'M'): QrCode {
  const codigo = criarQr(texto, {
    errorCorrectionLevel: nivel as QRCodeErrorCorrectionLevel,
  });
  const tamanho = codigo.modules.size;
  const dados = codigo.modules.data;
  const modulos: boolean[][] = [];
  for (let y = 0; y < tamanho; y++) {
    const linha: boolean[] = [];
    for (let x = 0; x < tamanho; x++) {
      linha.push(dados[y * tamanho + x] !== 0);
    }
    modulos.push(linha);
  }
  return { tamanho, modulos };
}

/** Gera o atributo "d" de um <path> SVG com os módulos escuros do QR code. */
export function qrParaCaminhoSvg(qr: QrCode): string {
  const partes: string[] = [];
  for (let y = 0; y < qr.tamanho; y++) {
    for (let x = 0; x < qr.tamanho; x++) {
      if (qr.modulos[y][x]) partes.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  return partes.join('');
}
