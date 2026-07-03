// Formatação de valores em pt-BR.

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatarMoeda(valor: number): string {
  return moeda.format(valor);
}

export function formatarData(iso: string): string {
  return dataCurta.format(new Date(iso));
}

export function formatarDataHora(iso: string): string {
  return dataHora.format(new Date(iso));
}

export type Periodo = 'dia' | 'semana' | 'mes';

export const ROTULOS_PERIODO: Record<Periodo, string> = {
  dia: 'Hoje',
  semana: 'Últimos 7 dias',
  mes: 'Últimos 30 dias',
};

export function inicioDoPeriodo(periodo: Periodo): Date {
  const inicio = new Date();
  if (periodo === 'dia') {
    inicio.setHours(0, 0, 0, 0);
  } else if (periodo === 'semana') {
    inicio.setDate(inicio.getDate() - 7);
  } else {
    inicio.setDate(inicio.getDate() - 30);
  }
  return inicio;
}
