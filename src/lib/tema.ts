// Tema claro/escuro do aplicativo.
//
// A preferência tem três valores: 'sistema' (padrão — acompanha o tema do
// dispositivo via prefers-color-scheme), 'claro' e 'escuro'. Ela fica no
// localStorage do aparelho (não no perfil: é uma escolha por dispositivo) e é
// aplicada como atributo data-tema em <html>, que o global.css usa para
// escolher a paleta. Um script inline no index.html aplica o atributo antes
// da primeira pintura para não piscar o tema errado.

import { useSyncExternalStore } from 'react';

export type PreferenciaTema = 'sistema' | 'claro' | 'escuro';

const CHAVE_TEMA = 'unimesinha.tema';

/** Cor do navegador/PWA (meta theme-color) em cada paleta. */
const COR_TEMA_CLARO = '#0f766e';
const COR_TEMA_ESCURO = '#1e293b';

const consultaEscuro = window.matchMedia('(prefers-color-scheme: dark)');
const ouvintes = new Set<() => void>();

export function obterPreferenciaTema(): PreferenciaTema {
  try {
    const valor = localStorage.getItem(CHAVE_TEMA);
    if (valor === 'claro' || valor === 'escuro') return valor;
  } catch {
    // localStorage indisponível (ex.: navegação privada restrita): usa o sistema.
  }
  return 'sistema';
}

export function definirPreferenciaTema(preferencia: PreferenciaTema): void {
  try {
    if (preferencia === 'sistema') localStorage.removeItem(CHAVE_TEMA);
    else localStorage.setItem(CHAVE_TEMA, preferencia);
  } catch {
    // Sem localStorage o tema vale só até recarregar a página.
  }
  aplicarTema();
  ouvintes.forEach((ouvinte) => ouvinte());
}

function temaEscuroAtivo(): boolean {
  const preferencia = obterPreferenciaTema();
  return preferencia === 'escuro' || (preferencia === 'sistema' && consultaEscuro.matches);
}

/** Sincroniza o data-tema de <html> e o meta theme-color com a preferência. */
export function aplicarTema(): void {
  const preferencia = obterPreferenciaTema();
  const raiz = document.documentElement;
  if (preferencia === 'sistema') delete raiz.dataset.tema;
  else raiz.dataset.tema = preferencia;

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', temaEscuroAtivo() ? COR_TEMA_ESCURO : COR_TEMA_CLARO);
}

// Em modo sistema, a troca de tema do dispositivo muda a paleta via CSS;
// aqui só acompanhamos o meta theme-color.
consultaEscuro.addEventListener('change', aplicarTema);

function inscrever(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

/** Preferência de tema atual, reativa à troca feita em qualquer componente. */
export function usePreferenciaTema(): PreferenciaTema {
  return useSyncExternalStore(inscrever, obterPreferenciaTema);
}
