import assert from 'node:assert/strict';
import test from 'node:test';
import { extrairIdPlanilha, montarLinkPlanilha } from '../src/lib/googleSheets.ts';

const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789-ab';

test('extrai o ID de um link de compartilhamento', () => {
  assert.equal(
    extrairIdPlanilha(`https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing`),
    ID,
  );
});

test('aceita links que incluem o seletor de conta do Google', () => {
  assert.equal(extrairIdPlanilha(`https://docs.google.com/spreadsheets/u/0/d/${ID}/edit`), ID);
});

test('mantém compatibilidade com um ID já armazenado', () => {
  assert.equal(extrairIdPlanilha(ID), ID);
});

test('recusa links externos e links sem ID', () => {
  assert.throws(() => extrairIdPlanilha(`https://exemplo.com/spreadsheets/d/${ID}/edit`));
  assert.throws(() => extrairIdPlanilha('https://docs.google.com/spreadsheets/'));
});

test('monta o link exibido a partir do ID armazenado', () => {
  assert.equal(montarLinkPlanilha(ID), `https://docs.google.com/spreadsheets/d/${ID}/edit`);
  assert.equal(montarLinkPlanilha(null), '');
});
