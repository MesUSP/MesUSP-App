// Gera os ícones PNG do PWA sem dependências externas: desenha uma mesinha
// estilizada em um buffer RGBA e codifica o PNG com o zlib do Node.

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const FUNDO = [15, 118, 110, 255]; // teal-700 (#0f766e)
const FRENTE = [255, 255, 255, 255];

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

function crc32(dados) {
  let c = 0xffffffff;
  for (const byte of dados) c = TABELA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloco(tipo, dados) {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tamanho, corpo, crc]);
}

function codificarPng(largura, altura, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; // profundidade de bits
  ihdr[9] = 6; // cor RGBA
  const linhas = Buffer.alloc((largura * 4 + 1) * altura);
  for (let y = 0; y < altura; y++) {
    const inicio = y * (largura * 4 + 1);
    linhas[inicio] = 0; // filtro "none"
    pixels.copy(linhas, inicio + 1, y * largura * 4, (y + 1) * largura * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(linhas, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

function desenharIcone(tamanho) {
  const pixels = Buffer.alloc(tamanho * tamanho * 4);
  const raio = tamanho * 0.18;

  const dentroDoFundo = (x, y) => {
    const dx = Math.max(raio - x, x - (tamanho - 1 - raio), 0);
    const dy = Math.max(raio - y, y - (tamanho - 1 - raio), 0);
    return dx * dx + dy * dy <= raio * raio;
  };

  // Mesinha estilizada: tampo horizontal e duas pernas.
  const tampo = { x0: 0.18, x1: 0.82, y0: 0.34, y1: 0.44 };
  const pernaEsquerda = { x0: 0.24, x1: 0.34, y0: 0.44, y1: 0.74 };
  const pernaDireita = { x0: 0.66, x1: 0.76, y0: 0.44, y1: 0.74 };
  const dentroDoGlifo = (x, y) => {
    const nx = x / tamanho;
    const ny = y / tamanho;
    return [tampo, pernaEsquerda, pernaDireita].some(
      (r) => nx >= r.x0 && nx <= r.x1 && ny >= r.y0 && ny <= r.y1,
    );
  };

  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      const deslocamento = (y * tamanho + x) * 4;
      let cor = [0, 0, 0, 0];
      if (dentroDoFundo(x, y)) cor = dentroDoGlifo(x, y) ? FRENTE : FUNDO;
      pixels[deslocamento] = cor[0];
      pixels[deslocamento + 1] = cor[1];
      pixels[deslocamento + 2] = cor[2];
      pixels[deslocamento + 3] = cor[3];
    }
  }
  return codificarPng(tamanho, tamanho, pixels);
}

mkdirSync(join(raiz, 'public/icons'), { recursive: true });
for (const tamanho of [192, 512]) {
  const destino = join(raiz, `public/icons/icon-${tamanho}.png`);
  writeFileSync(destino, desenharIcone(tamanho));
  console.log(`gerado ${destino}`);
}
