// Codificador de QR Code (ISO/IEC 18004) em modo byte, versões 1 a 10.
//
// Implementação própria porque o projeto não usa bibliotecas externas de
// interface (RNF-ARCH-02). Cobre códigos com até ~213 bytes de dados no
// nível M, suficiente para URLs de cardápio e payloads PIX.

export type NivelCorrecao = 'L' | 'M' | 'Q' | 'H';

interface EstruturaBlocos {
  /** Codewords de correção por bloco. */
  ec: number;
  /** Grupos de blocos: [quantidade de blocos, codewords de dados por bloco]. */
  grupos: [number, number][];
}

const FORMATO_NIVEL: Record<NivelCorrecao, number> = { L: 1, M: 0, Q: 3, H: 2 };

// Total de codewords por versão (1 a 10).
const TOTAL_CODEWORDS = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346];

// Estrutura de blocos por nível e versão (1 a 10).
const BLOCOS: Record<NivelCorrecao, EstruturaBlocos[]> = {
  L: [
    { ec: 7, grupos: [[1, 19]] },
    { ec: 10, grupos: [[1, 34]] },
    { ec: 15, grupos: [[1, 55]] },
    { ec: 20, grupos: [[1, 80]] },
    { ec: 26, grupos: [[1, 108]] },
    { ec: 18, grupos: [[2, 68]] },
    { ec: 20, grupos: [[2, 78]] },
    { ec: 24, grupos: [[2, 97]] },
    { ec: 30, grupos: [[2, 116]] },
    { ec: 18, grupos: [[2, 68], [2, 69]] },
  ],
  M: [
    { ec: 10, grupos: [[1, 16]] },
    { ec: 16, grupos: [[1, 28]] },
    { ec: 26, grupos: [[1, 44]] },
    { ec: 18, grupos: [[2, 32]] },
    { ec: 24, grupos: [[2, 43]] },
    { ec: 16, grupos: [[4, 27]] },
    { ec: 18, grupos: [[4, 31]] },
    { ec: 22, grupos: [[2, 38], [2, 39]] },
    { ec: 22, grupos: [[3, 36], [2, 37]] },
    { ec: 26, grupos: [[4, 43], [1, 44]] },
  ],
  Q: [
    { ec: 13, grupos: [[1, 13]] },
    { ec: 22, grupos: [[1, 22]] },
    { ec: 18, grupos: [[2, 17]] },
    { ec: 26, grupos: [[2, 24]] },
    { ec: 18, grupos: [[2, 15], [2, 16]] },
    { ec: 24, grupos: [[4, 19]] },
    { ec: 18, grupos: [[2, 14], [4, 15]] },
    { ec: 22, grupos: [[4, 18], [2, 19]] },
    { ec: 20, grupos: [[4, 16], [4, 17]] },
    { ec: 24, grupos: [[6, 19], [2, 20]] },
  ],
  H: [
    { ec: 17, grupos: [[1, 9]] },
    { ec: 28, grupos: [[1, 16]] },
    { ec: 22, grupos: [[2, 13]] },
    { ec: 16, grupos: [[4, 9]] },
    { ec: 22, grupos: [[2, 11], [2, 12]] },
    { ec: 28, grupos: [[4, 15]] },
    { ec: 26, grupos: [[4, 13], [1, 14]] },
    { ec: 26, grupos: [[4, 14], [2, 15]] },
    { ec: 24, grupos: [[4, 12], [4, 13]] },
    { ec: 28, grupos: [[6, 15], [2, 16]] },
  ],
};

// Coordenadas dos padrões de alinhamento por versão (1 a 10).
const ALINHAMENTO: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

// --------------------------------------------------------------------------
// Aritmética em GF(256) e Reed–Solomon
// --------------------------------------------------------------------------

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function polinomioGerador(grau: number): Uint8Array {
  let gerador = new Uint8Array([1]);
  for (let i = 0; i < grau; i++) {
    const proximo = new Uint8Array(gerador.length + 1);
    for (let j = 0; j < gerador.length; j++) {
      proximo[j] ^= gfMul(gerador[j], GF_EXP[i]);
      proximo[j + 1] ^= gerador[j];
    }
    gerador = proximo;
  }
  return gerador;
}

function restoReedSolomon(dados: number[], gerador: Uint8Array): Uint8Array {
  const resto = new Uint8Array(gerador.length - 1);
  for (const byte of dados) {
    const fator = byte ^ resto[0];
    resto.copyWithin(0, 1);
    resto[resto.length - 1] = 0;
    for (let i = 0; i < resto.length; i++) {
      resto[i] ^= gfMul(gerador[i + 1], fator);
    }
  }
  return resto;
}

// --------------------------------------------------------------------------
// Montagem dos codewords
// --------------------------------------------------------------------------

function codificarDados(bytes: Uint8Array, versao: number, nivel: NivelCorrecao): number[] {
  const estrutura = BLOCOS[nivel][versao - 1];
  const totalDados = estrutura.grupos.reduce((soma, [n, tam]) => soma + n * tam, 0);
  const totalBits = totalDados * 8;
  const bitsContagem = versao <= 9 ? 8 : 16;

  const bits: number[] = [];
  const anexar = (valor: number, quantidade: number) => {
    for (let i = quantidade - 1; i >= 0; i--) bits.push((valor >> i) & 1);
  };

  anexar(0b0100, 4); // modo byte
  anexar(bytes.length, bitsContagem);
  for (const byte of bytes) anexar(byte, 8);

  // Terminador e alinhamento a byte.
  anexar(0, Math.min(4, totalBits - bits.length));
  anexar(0, (8 - (bits.length % 8)) % 8);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }
  for (let alternador = 0; codewords.length < totalDados; alternador ^= 1) {
    codewords.push(alternador === 0 ? 0xec : 0x11);
  }
  return codewords;
}

function intercalarBlocos(codewords: number[], versao: number, nivel: NivelCorrecao): number[] {
  const estrutura = BLOCOS[nivel][versao - 1];
  const gerador = polinomioGerador(estrutura.ec);

  const blocosDados: number[][] = [];
  const blocosEc: Uint8Array[] = [];
  let posicao = 0;
  for (const [quantidade, tamanho] of estrutura.grupos) {
    for (let i = 0; i < quantidade; i++) {
      const bloco = codewords.slice(posicao, posicao + tamanho);
      posicao += tamanho;
      blocosDados.push(bloco);
      blocosEc.push(restoReedSolomon(bloco, gerador));
    }
  }

  const resultado: number[] = [];
  const maiorBloco = Math.max(...blocosDados.map((b) => b.length));
  for (let i = 0; i < maiorBloco; i++) {
    for (const bloco of blocosDados) {
      if (i < bloco.length) resultado.push(bloco[i]);
    }
  }
  for (let i = 0; i < estrutura.ec; i++) {
    for (const bloco of blocosEc) resultado.push(bloco[i]);
  }
  return resultado;
}

// --------------------------------------------------------------------------
// Matriz de módulos
// --------------------------------------------------------------------------

class MatrizQr {
  readonly tamanho: number;
  readonly modulos: boolean[][];
  readonly funcionais: boolean[][];

  constructor(versao: number) {
    this.tamanho = versao * 4 + 17;
    this.modulos = Array.from({ length: this.tamanho }, () => Array(this.tamanho).fill(false));
    this.funcionais = Array.from({ length: this.tamanho }, () => Array(this.tamanho).fill(false));
  }

  definirFuncional(x: number, y: number, escuro: boolean): void {
    this.modulos[y][x] = escuro;
    this.funcionais[y][x] = true;
  }
}

function desenharPadraoLocalizador(m: MatrizQr, cx: number, cy: number): void {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || x >= m.tamanho || y < 0 || y >= m.tamanho) continue;
      const distancia = Math.max(Math.abs(dx), Math.abs(dy));
      m.definirFuncional(x, y, distancia !== 2 && distancia !== 4);
    }
  }
}

function desenharPadraoAlinhamento(m: MatrizQr, cx: number, cy: number): void {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      m.definirFuncional(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
}

function desenharInformacaoFormato(m: MatrizQr, nivel: NivelCorrecao, mascara: number): void {
  const dados = (FORMATO_NIVEL[nivel] << 3) | mascara;
  let resto = dados;
  for (let i = 0; i < 10; i++) resto = (resto << 1) ^ ((resto >> 9) * 0x537);
  const bits = ((dados << 10) | resto) ^ 0x5412;
  const bit = (i: number) => ((bits >> i) & 1) !== 0;

  for (let i = 0; i <= 5; i++) m.definirFuncional(8, i, bit(i));
  m.definirFuncional(8, 7, bit(6));
  m.definirFuncional(8, 8, bit(7));
  m.definirFuncional(7, 8, bit(8));
  for (let i = 9; i < 15; i++) m.definirFuncional(14 - i, 8, bit(i));

  for (let i = 0; i < 8; i++) m.definirFuncional(m.tamanho - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) m.definirFuncional(8, m.tamanho - 15 + i, bit(i));
  m.definirFuncional(8, m.tamanho - 8, true); // módulo escuro fixo
}

function desenharInformacaoVersao(m: MatrizQr, versao: number): void {
  if (versao < 7) return;
  let resto = versao;
  for (let i = 0; i < 12; i++) resto = (resto << 1) ^ ((resto >> 11) * 0x1f25);
  const bits = (versao << 12) | resto;
  for (let i = 0; i < 18; i++) {
    const escuro = ((bits >> i) & 1) !== 0;
    const a = m.tamanho - 11 + (i % 3);
    const b = Math.floor(i / 3);
    m.definirFuncional(a, b, escuro);
    m.definirFuncional(b, a, escuro);
  }
}

function desenharPadroesFuncionais(m: MatrizQr, versao: number, nivel: NivelCorrecao): void {
  for (let i = 0; i < m.tamanho; i++) {
    m.definirFuncional(6, i, i % 2 === 0);
    m.definirFuncional(i, 6, i % 2 === 0);
  }
  desenharPadraoLocalizador(m, 3, 3);
  desenharPadraoLocalizador(m, m.tamanho - 4, 3);
  desenharPadraoLocalizador(m, 3, m.tamanho - 4);

  const posicoes = ALINHAMENTO[versao - 1];
  for (let i = 0; i < posicoes.length; i++) {
    for (let j = 0; j < posicoes.length; j++) {
      const canto =
        (i === 0 && j === 0) ||
        (i === 0 && j === posicoes.length - 1) ||
        (i === posicoes.length - 1 && j === 0);
      if (!canto) desenharPadraoAlinhamento(m, posicoes[i], posicoes[j]);
    }
  }

  desenharInformacaoFormato(m, nivel, 0); // reserva a área; reescrito após a máscara
  desenharInformacaoVersao(m, versao);
}

function desenharCodewords(m: MatrizQr, codewords: number[]): void {
  let indiceBit = 0;
  const totalBits = codewords.length * 8;
  for (let direita = m.tamanho - 1; direita >= 1; direita -= 2) {
    if (direita === 6) direita = 5;
    for (let vertical = 0; vertical < m.tamanho; vertical++) {
      for (let j = 0; j < 2; j++) {
        const x = direita - j;
        const paraCima = ((direita + 1) & 2) === 0;
        const y = paraCima ? m.tamanho - 1 - vertical : vertical;
        if (!m.funcionais[y][x] && indiceBit < totalBits) {
          m.modulos[y][x] =
            ((codewords[indiceBit >> 3] >> (7 - (indiceBit & 7))) & 1) !== 0;
          indiceBit++;
        }
      }
    }
  }
}

const MASCARAS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function aplicarMascara(m: MatrizQr, mascara: number): void {
  const predicado = MASCARAS[mascara];
  for (let y = 0; y < m.tamanho; y++) {
    for (let x = 0; x < m.tamanho; x++) {
      if (!m.funcionais[y][x] && predicado(x, y)) {
        m.modulos[y][x] = !m.modulos[y][x];
      }
    }
  }
}

function penalidade(m: MatrizQr): number {
  const n = m.tamanho;
  let pontos = 0;

  // Sequências de módulos da mesma cor (N1) e padrões tipo localizador (N3).
  const avaliarLinha = (obter: (i: number) => boolean) => {
    let corrida = 1;
    let corAnterior = obter(0);
    let bitsJanela = corAnterior ? 1 : 0;
    for (let i = 1; i < n; i++) {
      const cor = obter(i);
      bitsJanela = ((bitsJanela << 1) | (cor ? 1 : 0)) & 0x7ff;
      if (i >= 10) {
        if (bitsJanela === 0b00001011101 || bitsJanela === 0b10111010000) pontos += 40;
      }
      if (cor === corAnterior) {
        corrida++;
        if (corrida === 5) pontos += 3;
        else if (corrida > 5) pontos += 1;
      } else {
        corAnterior = cor;
        corrida = 1;
      }
    }
  };
  for (let y = 0; y < n; y++) avaliarLinha((x) => m.modulos[y][x]);
  for (let x = 0; x < n; x++) avaliarLinha((y) => m.modulos[y][x]);

  // Blocos 2x2 da mesma cor (N2).
  for (let y = 0; y < n - 1; y++) {
    for (let x = 0; x < n - 1; x++) {
      const cor = m.modulos[y][x];
      if (
        cor === m.modulos[y][x + 1] &&
        cor === m.modulos[y + 1][x] &&
        cor === m.modulos[y + 1][x + 1]
      ) {
        pontos += 3;
      }
    }
  }

  // Proporção de módulos escuros (N4).
  let escuros = 0;
  for (const linha of m.modulos) for (const cor of linha) if (cor) escuros++;
  const percentual = (escuros * 100) / (n * n);
  pontos += Math.floor(Math.abs(percentual - 50) / 5) * 10;

  return pontos;
}

// --------------------------------------------------------------------------
// API pública
// --------------------------------------------------------------------------

export interface QrCode {
  tamanho: number;
  /** modulos[y][x] === true indica módulo escuro. */
  modulos: boolean[][];
}

export function gerarQrCode(texto: string, nivel: NivelCorrecao = 'M'): QrCode {
  const bytes = new TextEncoder().encode(texto);

  let versao = 0;
  for (let candidata = 1; candidata <= 10; candidata++) {
    const estrutura = BLOCOS[nivel][candidata - 1];
    const totalDados = estrutura.grupos.reduce((soma, [qtd, tam]) => soma + qtd * tam, 0);
    const bitsNecessarios = 4 + (candidata <= 9 ? 8 : 16) + bytes.length * 8;
    if (bitsNecessarios <= totalDados * 8) {
      versao = candidata;
      break;
    }
  }
  if (versao === 0) {
    throw new Error('Conteúdo grande demais para o QR code (máx. versão 10).');
  }

  const dados = codificarDados(bytes, versao, nivel);
  const codewords = intercalarBlocos(dados, versao, nivel);
  if (codewords.length !== TOTAL_CODEWORDS[versao - 1]) {
    throw new Error('Erro interno na montagem dos codewords do QR code.');
  }

  const matriz = new MatrizQr(versao);
  desenharPadroesFuncionais(matriz, versao, nivel);
  desenharCodewords(matriz, codewords);

  let melhorMascara = 0;
  let melhorPontuacao = Infinity;
  for (let mascara = 0; mascara < 8; mascara++) {
    aplicarMascara(matriz, mascara);
    desenharInformacaoFormato(matriz, nivel, mascara);
    const pontuacao = penalidade(matriz);
    if (pontuacao < melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhorMascara = mascara;
    }
    aplicarMascara(matriz, mascara); // desfaz (XOR é involutivo)
  }
  aplicarMascara(matriz, melhorMascara);
  desenharInformacaoFormato(matriz, nivel, melhorMascara);

  return { tamanho: matriz.tamanho, modulos: matriz.modulos };
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
