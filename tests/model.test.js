import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayNum, weekStart } from '../js/days.js';
import {
  ROW_ORDER, newState, cardKey, parseKey, applyAnswer, rowStage,
  unlockedRows, focusRow, manualUnlock, dueKeys, dayGoalReached, dayGoalTarget, dayProgress, recordRound, recordQuiz,
  SPEED_OPTIONS, speedLimit, tempoRecheck, markDiscovered,
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

test('langsam (Hochzählen) bringt 0→1, aber nicht auf 2', () => {
  const s = newState(T);
  const first = applyAnswer(s, '3x2', { correct: true, ms: 9000, today: T });
  assert.equal(s.cards['3x2'].box, 1);
  assert.equal(first.slow, false); // Kennenlernen aus Fach 0 ist nie „zu langsam“
  const second = applyAnswer(s, '3x2', { correct: true, ms: 9000, today: T });
  assert.equal(s.cards['3x2'].box, 1);
  assert.equal(s.cards['3x2'].due, T);
  assert.equal(second.slow, true);
  assert.equal(second.fast, false);
});

test('blitzschnell (≤ 4 s) hebt 1→2', () => {
  const s = newState(T);
  applyAnswer(s, '3x2', { correct: true, ms: 9000, today: T });
  const r = applyAnswer(s, '3x2', { correct: true, ms: 4000, today: T });
  assert.equal(r.fast, true);
  assert.equal(s.cards['3x2'].box, 2);
  assert.equal(s.cards['3x2'].due, T + 1);
});

test('Zeitgrenze kommt aus den Einstellungen (3/4/6 s), sonst 4 s', () => {
  assert.deepEqual(SPEED_OPTIONS, [3000, 4000, 6000]);
  const s = newState(T);
  assert.equal(speedLimit(s), 4000);
  s.settings.speedMs = 3000;
  Object.assign(s.cards['3x2'], { box: 1, due: T });
  assert.equal(applyAnswer(s, '3x2', { correct: true, ms: 3500, today: T }).slow, true);
  s.settings.speedMs = 6000;
  assert.equal(applyAnswer(s, '3x2', { correct: true, ms: 5500, today: T }).fast, true);
  assert.equal(s.cards['3x2'].box, 2);
  s.settings.speedMs = 1234;
  assert.equal(speedLimit(s), 4000);
});

test('Wiederholung in derselben Runde hebt nicht an', () => {
  const s = newState(T);
  Object.assign(s.cards['3x2'], { box: 1, due: T });
  const r = applyAnswer(s, '3x2', { correct: true, ms: 1000, today: T, repeat: true });
  assert.equal(r.fast, true);
  assert.equal(s.cards['3x2'].box, 1);
  assert.equal(s.stats.right, 1);
});

test('Silber nur mit blitzschnellen Antworten – Hochzählen schaltet nichts frei', () => {
  const s = newState(T);
  answerRow(s, 2, { ms: 12000 });
  const slow = answerRow(s, 2, { ms: 12000 });
  assert.equal(rowStage(s, 2), 1);
  assert.ok(slow.every((r) => r.unlocked.length === 0));
  const fast = answerRow(s, 2, { ms: 2500 });
  assert.equal(rowStage(s, 2), 2);
  assert.deepEqual(fast.at(-1).unlocked, [10]);
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

test('langsam ab Fach 2 fällt auf Fach 1 zurück, fällig heute, kein Fehler', () => {
  const s = newState(T);
  Object.assign(s.cards['3x2'], { box: 4, due: T });
  s.stats.streak = 3;
  const r = applyAnswer(s, '3x2', { correct: true, ms: 8000, today: T });
  assert.equal(r.slow, true);
  assert.equal(s.cards['3x2'].box, 1);
  assert.equal(s.cards['3x2'].due, T);
  assert.equal(s.cards['3x2'].wrong, 0);
  assert.equal(s.stats.streak, 4);
  assert.equal(s.days[T].right, 1);
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

function answerN(state, count, { correct = true, today = T } = {}) {
  const results = [];
  for (let i = 0; i < count; i++) results.push(applyAnswer(state, cardKey((i % 10) + 1, 2), { correct, ms: 2000, today }));
  return results;
}

test('Tagesziel: 30 richtige Aufgaben, falsche zählen nicht', () => {
  const s = newState(T);
  assert.equal(dayGoalTarget(s), 30);
  answerN(s, 40, { correct: false });
  answerN(s, 29);
  assert.equal(dayGoalReached(s, T), false);
  const [last] = answerN(s, 1);
  assert.equal(last.goalReached, true);
  assert.equal(dayGoalReached(s, T), true);
  assert.equal(answerN(s, 1)[0].goalReached, false); // nur einmal gemeldet
});

test('Entdecker-Runde allein ist kein Tagesziel', () => {
  const s = newState(T);
  answerN(s, 10);
  recordRound(s, { mode: 'daily', perfect: true, today: T });
  assert.equal(dayGoalReached(s, T), false);
  assert.deepEqual(dayProgress(s, T), { right: 10, target: 30, reached: false });
});

test('Tagesziel einstellbar; erreichtes Ziel bleibt, wenn es später erhöht wird', () => {
  const s = newState(T);
  s.settings.dayGoal = 20;
  answerN(s, 20);
  assert.equal(dayGoalReached(s, T), true);
  s.settings.dayGoal = 50;
  assert.equal(dayGoalReached(s, T), true);
  assert.equal(dayGoalReached(s, T + 1), false);
  s.settings.dayGoal = 7; // ungültig → Standard
  assert.equal(dayGoalTarget(s), 30);
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

test('Quizantwort: richtig zählt fürs Tagesziel, ändert aber keine Karten und keine Serie', () => {
  const s = newState(T);
  const cardsBefore = JSON.stringify(s.cards);
  s.stats.streak = 4;
  for (let i = 0; i < 29; i++) applyAnswer(s, cardKey((i % 10) + 1, 2), { correct: true, ms: 2000, today: T });
  const cardsMid = JSON.stringify(s.cards);
  const streak = s.stats.streak;
  assert.notEqual(cardsMid, cardsBefore);
  const wrong = recordQuiz(s, { correct: false, today: T });
  assert.equal(wrong.goalReached, false);
  assert.equal(s.days[T].right, 29);
  assert.equal(s.days[T].tasks, 30);
  assert.equal(s.stats.streak, streak);
  const right = recordQuiz(s, { correct: true, today: T });
  assert.equal(right.goalReached, true);
  assert.ok(dayGoalReached(s, T));
  assert.equal(s.days[T].right, 30);
  assert.equal(s.stats.quizRight, 1);
  assert.equal(s.stats.quizTotal, 2);
  assert.equal(s.stats.streak, streak);
  assert.equal(JSON.stringify(s.cards), cardsMid);
  assert.equal(recordQuiz(s, { correct: true, today: T }).goalReached, false); // nur einmal melden
});

// Reihe offen wie durch normales Freischalten (nicht von Hand), mit Karten in Fach box und letzter Zeit ms.
function setRow(s, n, box, ms = 2000) {
  const row = s.rows[n];
  if (!row.open) { s.seq += 1; Object.assign(row, { open: true, seq: s.seq, manual: false }); }
  row.discovered = true;
  for (let k = 1; k <= 10; k++) Object.assign(s.cards[cardKey(k, n)], { box, due: T + 1, lastMs: ms });
  row.stage = box >= 5 ? 4 : box >= 4 ? 3 : box >= 2 ? 2 : box >= 1 ? 1 : 0;
}

function tempoState() {
  const s = newState(T);
  setRow(s, 2, 2);
  setRow(s, 10, 2);
  s.cards['7x10'].lastMs = 9000;
  setRow(s, 5, 3);
  setRow(s, 1, 2);
  s.cards['3x1'].lastMs = 15000;
  s.cards['8x1'].lastMs = 4500;
  setRow(s, 4, 1, 20000);
  return s;
}

test('Tempo-Prüfung: Vorschau ändert nichts', () => {
  const s = tempoState();
  const before = JSON.stringify(s);
  const r = tempoRecheck(s, T);
  assert.deepEqual([...r.demoted].sort(), ['3x1', '7x10', '8x1']);
  assert.deepEqual(r.locked, [1, 4]);
  assert.equal(r.focus, 10);
  assert.equal(JSON.stringify(s), before);
});

test('Tempo-Prüfung: langsame Karten zurück, Inseln ohne Silber gesperrt bis auf eine', () => {
  const s = tempoState();
  s.stickers['row-1-2'] = { day: T, fresh: false };
  tempoRecheck(s, T, { apply: true });
  assert.deepEqual(s.cards['7x10'], { ...s.cards['7x10'], box: 1, due: T });
  assert.equal(s.cards['1x10'].box, 2); // schnelle Karten bleiben
  assert.equal(s.cards['3x4'].box, 1); // Fach 1 bleibt Fach 1
  assert.equal(rowStage(s, 10), 1);
  assert.equal(rowStage(s, 1), 1);
  assert.equal(rowStage(s, 5), 2); // Fach 3 überall → Silber (Gold braucht Fach 4)
  assert.deepEqual(unlockedRows(s), [2, 10, 5]);
  assert.equal(focusRow(s), 10);
  assert.ok(s.rows[1].discovered && s.rows[4].discovered);
  assert.ok(s.stickers['row-1-2']); // Sticker bleiben
});

test('Tempo-Prüfung: von Hand freigeschaltete Reihe bleibt offen', () => {
  const s = tempoState();
  s.rows[4].manual = true;
  const r = tempoRecheck(s, T, { apply: true });
  assert.deepEqual(r.locked, [1]);
  assert.ok(s.rows[4].open);
});

test('Tempo-Prüfung: ist die 2er nicht mehr Silber, wird sie die Übungsinsel', () => {
  const s = newState(T);
  setRow(s, 2, 2, 9000);
  setRow(s, 10, 2);
  setRow(s, 5, 1);
  const r = tempoRecheck(s, T, { apply: true });
  assert.deepEqual(unlockedRows(s), [2, 10]);
  assert.deepEqual(r.locked, [5]);
  assert.equal(r.focus, 2);
});

test('Tempo-Prüfung: alles schnell → nichts ändert sich', () => {
  const s = newState(T);
  setRow(s, 2, 3);
  setRow(s, 10, 1, 9000);
  const before = JSON.stringify(s);
  const r = tempoRecheck(s, T, { apply: true });
  assert.deepEqual(r.demoted, []);
  assert.deepEqual(r.locked, []);
  assert.equal(JSON.stringify(s), before);
});
