import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState, cardKey, applyAnswer, recordRound, recordQuiz } from '../js/model.js';
import { STICKERS, syncStickers, stickersInGroup } from '../js/stickers.js';
import { weekStart } from '../js/days.js';

const T = weekStart(20000); // ein Montag

// Tagesziel erreichen: 30 richtige Antworten an einem Tag
function reachGoal(state, today = T) {
  for (let i = 0; i < 30; i++) applyAnswer(state, cardKey((i % 10) + 1, 2), { correct: true, ms: 2000, today });
}

function rowTwice(state, n, today = T) {
  for (let r = 0; r < 2; r++) for (let k = 1; k <= 10; k++) applyAnswer(state, cardKey(k, n), { correct: true, ms: 2000, today });
}

test('Katalog: eindeutige IDs, 40 Reihen-Sticker, Meister glitzern', () => {
  assert.equal(new Set(STICKERS.map((s) => s.id)).size, STICKERS.length);
  const rowStickers = STICKERS.filter((s) => s.group.startsWith('row-'));
  assert.equal(rowStickers.length, 40);
  assert.ok(rowStickers.filter((s) => s.stage === 4).every((s) => s.holo));
  assert.ok(STICKERS.length >= 80);
});

test('Stufenaufstieg 2er Silber gibt Sticker der 2er-Gruppe Stufe 1 und 2', () => {
  const s = newState(T);
  rowTwice(s, 2);
  const got = syncStickers(s, T, () => 0);
  assert.ok(got.includes('row-2-1'));
  assert.ok(got.includes('row-2-2'));
  assert.ok(!got.includes('row-2-3'));
});

test('Tages-Sticker nur einmal pro Tag, kein Sticker doppelt', () => {
  const s = newState(T);
  recordRound(s, { mode: 'daily', perfect: false, today: T });
  reachGoal(s, T);
  const a = syncStickers(s, T, () => 0);
  assert.equal(a.filter((id) => id.startsWith('day-')).length, 1);
  recordRound(s, { mode: 'daily', perfect: false, today: T });
  reachGoal(s, T);
  const b = syncStickers(s, T, () => 0);
  assert.equal(b.filter((id) => id.startsWith('day-')).length, 0);
  assert.ok(a.includes('sp-first'));
  assert.ok(!b.includes('sp-first'));
});

test('Wochen-Sticker bei 4 Tagen mit Tagesziel, einmal pro Woche', () => {
  const s = newState(T);
  let weekly = [];
  for (let d = 0; d < 6; d++) {
    reachGoal(s, T + d);
    weekly = weekly.concat(syncStickers(s, T + d, () => 0).filter((id) => id.startsWith('week-')));
    if (d === 2) assert.equal(weekly.length, 0);
  }
  assert.equal(weekly.length, 1);
});

test('Tages-Sticker erst ab 30 richtigen Aufgaben', () => {
  const s = newState(T);
  for (let i = 0; i < 29; i++) applyAnswer(s, cardKey((i % 10) + 1, 2), { correct: true, ms: 2000, today: T });
  recordRound(s, { mode: 'daily', perfect: true, today: T });
  assert.equal(syncStickers(s, T, () => 0).filter((id) => id.startsWith('day-')).length, 0);
  applyAnswer(s, '1x2', { correct: true, ms: 2000, today: T });
  assert.equal(syncStickers(s, T, () => 0).filter((id) => id.startsWith('day-')).length, 1);
});

test('falsche Antworten zählen nicht fürs Tagesziel', () => {
  const s = newState(T);
  for (let i = 0; i < 60; i++) applyAnswer(s, cardKey((i % 10) + 1, 2), { correct: false, ms: 500, today: T });
  assert.equal(syncStickers(s, T, () => 0).filter((id) => id.startsWith('day-')).length, 0);
});

test('Tages-Sticker wird nachträglich vergeben, wenn die App vorher geschlossen wurde', () => {
  const s = newState(T);
  reachGoal(s, T);
  // kein sync an Tag T (App mitten in der Runde geschlossen), nächster Start zwei Tage später
  const got = syncStickers(s, T + 2, () => 0).filter((id) => id.startsWith('day-'));
  assert.equal(got.length, 1);
  assert.equal(s.stickers[got[0]].day, T);
});

test('Wochen-Sticker wird nachträglich in der Folgewoche vergeben', () => {
  const s = newState(T);
  for (let d = 0; d < 4; d++) reachGoal(s, T + d);
  const got = syncStickers(s, T + 9, () => 0).filter((id) => id.startsWith('week-'));
  assert.equal(got.length, 1);
  assert.equal(syncStickers(s, T + 10, () => 0).filter((id) => id.startsWith('week-')).length, 0);
});

test('Wackel-Aufgabe: ≥ 3 Fehler und dann Fach 4', () => {
  const s = newState(T);
  Object.assign(s.cards['7x2'], { wrong: 3, box: 4 });
  assert.ok(syncStickers(s, T, () => 0).includes('sp-wackel'));
});

test('alle Tages-Sticker gesammelt → kein Absturz, kein Duplikat', () => {
  const s = newState(T);
  for (const st of stickersInGroup('day')) s.stickers[st.id] = { day: T };
  reachGoal(s, T);
  const got = syncStickers(s, T, () => 0);
  assert.equal(got.filter((id) => id.startsWith('day-')).length, 0);
});

test('Zahlen-Detektiv nach 10 richtigen Quizfragen, falsche zählen nicht', () => {
  const s = newState(T);
  for (let i = 0; i < 9; i++) recordQuiz(s, { correct: true, today: T });
  for (let i = 0; i < 5; i++) recordQuiz(s, { correct: false, today: T });
  assert.ok(!syncStickers(s, T, () => 0).includes('sp-quiz10'));
  recordQuiz(s, { correct: true, today: T });
  assert.ok(syncStickers(s, T, () => 0).includes('sp-quiz10'));
  assert.ok(STICKERS.some((x) => x.id === 'sp-quiz10' && x.group === 'special'));
});
