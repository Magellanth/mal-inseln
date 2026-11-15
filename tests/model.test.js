import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayNum, weekStart } from '../js/days.js';
import {
  ROW_ORDER, newState, cardKey, parseKey, applyAnswer, rowStage,
  unlockedRows, focusRow, manualUnlock, dueKeys,
} from '../js/model.js';

const T = 20000; // beliebiger Tag

function answerRow(state, n, { ms = 2000, today = T, correct = true } = {}) {
  const res = [];
  for (let k = 1; k <= 10; k++) res.push(applyAnswer(state, cardKey(k, n), { correct, ms, today }));
  return res;
}

test('days: Tagesnummer und Wochenbeginn (Montag)', () => {
  const sun = dayNum(new Date(2026, 10, 15, 23, 59));
  const mon = dayNum(new Date(2026, 10, 9, 0, 1));
  assert.equal(sun - mon, 6);
  assert.equal(weekStart(sun), mon);
  assert.equal(weekStart(mon), mon);
});

test('newState: nur Reihe 2 offen, 100 Karten in Fach 0', () => {
  const s = newState(T);
  assert.deepEqual(unlockedRows(s), [2]);
  assert.equal(Object.keys(s.cards).length, 100);
  assert.ok(Object.values(s.cards).every((c) => c.box === 0 && c.due === null));
  assert.deepEqual(ROW_ORDER, [2, 10, 5, 1, 4, 8, 3, 6, 9, 7]);
});

test('cardKey/parseKey', () => {
  assert.equal(cardKey(7, 6), '7x6');
  assert.deepEqual(parseKey('7x6'), { k: 7, n: 6 });
});

test('richtig hebt 0→1→2 auch langsam', () => {
  const s = newState(T);
  applyAnswer(s, '3x2', { correct: true, ms: 9000, today: T });
  assert.equal(s.cards['3x2'].box, 1);
  applyAnswer(s, '3x2', { correct: true, ms: 9000, today: T });
  assert.equal(s.cards['3x2'].box, 2);
  assert.equal(s.cards['3x2'].due, T + 1);
});

test('pauken am selben Tag bleibt bei Fach 2', () => {
  const s = newState(T);
  for (let i = 0; i < 10; i++) applyAnswer(s, '3x2', { correct: true, ms: 1500, today: T });
  assert.equal(s.cards['3x2'].box, 2);
});

test('fällig + flott steigt über 2', () => {
  const s = newState(T);
  Object.assign(s.cards['3x2'], { box: 2, due: T });
  const r = applyAnswer(s, '3x2', { correct: true, ms: 2000, today: T });
  assert.equal(r.newBox, 3);
  assert.equal(s.cards['3x2'].due, T + 3);
});

test('langsam steigt nicht über 2', () => {
  const s = newState(T);
  Object.assign(s.cards['3x2'], { box: 2, due: T });
  applyAnswer(s, '3x2', { correct: true, ms: 8000, today: T });
  assert.equal(s.cards['3x2'].box, 2);
  assert.equal(s.cards['3x2'].due, T);
});

test('Fach 5 bleibt Fach 5', () => {
  const s = newState(T);
  Object.assign(s.cards['3x2'], { box: 5, due: T });
  applyAnswer(s, '3x2', { correct: true, ms: 1000, today: T });
  assert.equal(s.cards['3x2'].box, 5);
  assert.equal(s.cards['3x2'].due, T + 21);
});

test('falsch setzt auf 1, aus 0 bleibt 0, due = heute', () => {
  const s = newState(T);
  Object.assign(s.cards['4x2'], { box: 4, due: T + 5 });
  applyAnswer(s, '4x2', { correct: false, ms: 3000, today: T });
  assert.equal(s.cards['4x2'].box, 1);
  assert.equal(s.cards['4x2'].due, T);
  assert.equal(s.cards['4x2'].wrong, 1);
  applyAnswer(s, '5x2', { correct: false, ms: 3000, today: T });
  assert.equal(s.cards['5x2'].box, 0);
});

test('Bronze/Silber für Reihe 2 und Freischaltung der 10', () => {
  const s = newState(T);
  const first = answerRow(s, 2);
  assert.equal(rowStage(s, 2), 1);
  assert.deepEqual(first.at(-1).stageUps, [{ row: 2, stage: 1 }]);
  const second = answerRow(s, 2);
  assert.equal(rowStage(s, 2), 2);
  assert.deepEqual(second.at(-1).stageUps, [{ row: 2, stage: 2 }]);
  assert.deepEqual(second.at(-1).unlocked, [10]);
  assert.deepEqual(unlockedRows(s), [2, 10]);
  assert.equal(focusRow(s), 10);
});

test('Gold und Meister brauchen fällige, flotte Antworten', () => {
  const s = newState(T);
  answerRow(s, 2); answerRow(s, 2); // Fach 2, fällig T+1
  answerRow(s, 2, { today: T + 1 }); // Fach 3, fällig T+4
  answerRow(s, 2, { today: T + 4 }); // Fach 4
  assert.equal(rowStage(s, 2), 3);
  answerRow(s, 2, { today: T + 11 }); // Fach 5
  assert.equal(rowStage(s, 2), 4);
});

test('Stufe sinkt nie', () => {
  const s = newState(T);
  answerRow(s, 2); answerRow(s, 2);
  applyAnswer(s, '7x2', { correct: false, ms: 2000, today: T });
  assert.equal(rowStage(s, 2), 2);
});

test('manuelle Freischaltung 7 wird Fokus; Auto-Freischaltung überspringt offene', () => {
  const s = newState(T);
  manualUnlock(s, 7);
  assert.equal(focusRow(s), 7);
  assert.deepEqual(unlockedRows(s), [2, 7]);
  answerRow(s, 2); answerRow(s, 2); // 2 Silber, 7 noch offen → keine neue Reihe
  assert.deepEqual(unlockedRows(s), [2, 7]);
  assert.equal(focusRow(s), 7);
  answerRow(s, 7); const r = answerRow(s, 7);
  assert.deepEqual(r.at(-1).unlocked, [10]);
  assert.equal(focusRow(s), 10);
  // 10 ist dran; manuell 5 öffnen, dann alle bis 9 → 7 nie doppelt geöffnet
  for (const n of [10, 5, 1, 4, 8, 3, 6, 9]) {
    if (!unlockedRows(s).includes(n)) manualUnlock(s, n);
  }
  assert.equal(unlockedRows(s).length, 10);
  assert.equal(new Set(unlockedRows(s)).size, 10);
});

test('Tageswechsel: due rechnet mit today der Antwort', () => {
  const s = newState(T);
  applyAnswer(s, '1x2', { correct: true, ms: 1000, today: T });
  applyAnswer(s, '1x2', { correct: true, ms: 1000, today: T + 1 });
  assert.equal(s.cards['1x2'].due, T + 2);
});

test('dueKeys: nur offene Reihen, sortiert nach due dann Fach', () => {
  const s = newState(T);
  Object.assign(s.cards['1x2'], { box: 3, due: T - 1 });
  Object.assign(s.cards['2x2'], { box: 1, due: T - 1 });
  Object.assign(s.cards['3x2'], { box: 2, due: T });
  Object.assign(s.cards['4x2'], { box: 2, due: T + 1 });
  Object.assign(s.cards['1x7'], { box: 2, due: T - 3 }); // Reihe 7 gesperrt
  assert.deepEqual(dueKeys(s, T), ['2x2', '1x2', '3x2']);
});

test('Statistik: Übungstag und Serie', () => {
  const s = newState(T);
  applyAnswer(s, '1x2', { correct: true, ms: 1000, today: T });
  applyAnswer(s, '2x2', { correct: true, ms: 1000, today: T });
  applyAnswer(s, '3x2', { correct: false, ms: 1000, today: T });
  assert.equal(s.days[T].tasks, 3);
  assert.equal(s.stats.bestStreak, 2);
  assert.equal(s.stats.streak, 0);
});
