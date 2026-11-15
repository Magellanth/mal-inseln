import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState, applyAnswer } from '../js/model.js';
import { load, save, encodeBackup, decodeBackup, STORAGE_KEY, BROKEN_KEY } from '../js/storage.js';

const T = 20000;

function mem(initial = {}) {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); } };
}

test('speichern und laden ergibt denselben Stand', () => {
  const store = mem();
  const s = newState(T);
  s.name = 'Jörg';
  applyAnswer(s, '3x2', { correct: true, ms: 1000, today: T });
  save(s, store);
  assert.deepEqual(load(store, T), s);
});

test('load mit kaputtem JSON → neuer Stand, Rohdaten beiseitegelegt', () => {
  const store = mem({ [STORAGE_KEY]: '{kaputt' });
  const s = load(store, T);
  assert.equal(s.cards['1x2'].box, 0);
  assert.equal(store.data[BROKEN_KEY], '{kaputt');
});

test('load mit fehlenden Teilen ergänzt diese', () => {
  const store = mem({ [STORAGE_KEY]: JSON.stringify({ v: 1, cards: { '3x2': { box: 3, due: T } }, rows: { 2: { open: true, seq: 1, stage: 0 } } }) });
  const s = load(store, T);
  assert.equal(s.cards['3x2'].box, 3);
  assert.equal(s.cards['3x2'].wrong, 0);
  assert.equal(Object.keys(s.cards).length, 100);
  assert.equal(s.rows[10].open, false);
  assert.deepEqual(s.stickers, {});
});

test('Backup hin und zurück identisch (auch mit Umlauten)', () => {
  const s = newState(T);
  s.name = 'Zoë Müller';
  applyAnswer(s, '7x2', { correct: false, ms: 1000, today: T });
  const code = encodeBackup(s);
  assert.match(code, /^EMM1-/);
  assert.deepEqual(decodeBackup(code, T), s);
  // Zeilenumbrüche und Leerzeichen aus Messengern stören nicht
  assert.deepEqual(decodeBackup(`  ${code.slice(0, 30)}\n${code.slice(30)} `, T), s);
});

test('Backup mit Text davor und danach wird trotzdem erkannt', () => {
  const s = newState(T);
  s.name = 'Mia';
  const code = encodeBackup(s);
  assert.deepEqual(decodeBackup(`Mal-Inseln Sicherung\n${code}\nNicht löschen!`, T), s);
  assert.deepEqual(decodeBackup(`Sicherung: ${code.slice(0, 50)}\n${code.slice(50)}`, T), s);
});

test('Backup mit Tippfehler → wirft, kein Stand', () => {
  const code = encodeBackup(newState(T));
  const broken = code.slice(0, -5) + (code.at(-5) === 'A' ? 'B' : 'A') + code.slice(-4);
  assert.throws(() => decodeBackup(broken, T), /unvollständig|lesen/);
  assert.throws(() => decodeBackup(code.slice(0, code.length / 2), T));
  assert.throws(() => decodeBackup('hallo', T), /Sicherungscode/);
});

test('alter Stand ohne Quiz-Zähler bekommt sie mit 0, nichts geht verloren', () => {
  const old = newState(T);
  delete old.stats.quizRight;
  delete old.stats.quizTotal;
  old.stats.right = 42;
  const store = mem({ [STORAGE_KEY]: JSON.stringify(old) });
  const s = load(store, T);
  assert.equal(s.stats.quizRight, 0);
  assert.equal(s.stats.quizTotal, 0);
  assert.equal(s.stats.right, 42);
});
