// Geração de payload PIX "copia e cola" (BR Code, padrão EMV-MPM do Bacen).

function removerAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function campo(id: string, valor: string): string {
  return id + valor.length.toString().padStart(2, '0') + valor;
}

/** CRC16/CCITT-FALSE (polinômio 0x1021, inicial 0xFFFF), exigido pelo BR Code. */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface DadosPix {
  chave: string;
  nomeRecebedor: string;
  cidade?: string;
  /** Valor em reais; quando omitido, o pagador digita o valor. */
  valor?: number;
  identificador?: string;
}

export function gerarPayloadPix(dados: DadosPix): string {
  const nome = removerAcentos(dados.nomeRecebedor).toUpperCase().slice(0, 25).trim() || 'RECEBEDOR';
  const cidade =
    removerAcentos(dados.cidade ?? 'SAO PAULO').toUpperCase().slice(0, 15).trim() || 'SAO PAULO';
  const identificador = (dados.identificador ?? '***').replace(/[^A-Za-z0-9*]/g, '').slice(0, 25) || '***';

  const contaMerchant = campo('00', 'br.gov.bcb.pix') + campo('01', dados.chave.trim());

  let payload =
    campo('00', '01') +
    campo('26', contaMerchant) +
    campo('52', '0000') +
    campo('53', '986');
  if (dados.valor && dados.valor > 0) {
    payload += campo('54', dados.valor.toFixed(2));
  }
  payload +=
    campo('58', 'BR') +
    campo('59', nome) +
    campo('60', cidade) +
    campo('62', campo('05', identificador)) +
    '6304';

  return payload + crc16(payload);
}
