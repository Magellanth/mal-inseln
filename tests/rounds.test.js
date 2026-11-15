import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState, cardKey, rowKeys, manualUnlock, markDiscovered, dueKeys } from '../js/model.js';
import { buildDailyRound, buildRowRound, pickBlitzTask, easyPool, Round, DAILY_SIZE } from '../js/rounds.js';

const T = 20000;

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const cardsOf = (r) => r.tasks.filter((t) => !t.quiz);
const quizzesOf = (r) => r.tasks.filter((t) => t.quiz);

test('erste Runde = Entdecker 2er in Reihenfolge mit hop', () => {
  const s = newState(T);
  const r = buildDailyRound(s, T, seeded());
  assert.equal(r.discoverRow, 2);
  assert.deepEqual(r.tasks.map((t) => t.key), rowKeys(2));
  assert.ok(r.tasks.every((t) => t.hop && !t.swapped));
});

test('nur 10 Karten offen → Runde mit 10 verschiedenen Karten', () => {
  const s = newState(T);
  markDiscovered(s, 2);
  const r = buildDailyRound(s, T, seeded());
  assert.equal(r.discoverRow, null);
  assert.equal(cardsOf(r).length, 10);
  assert.equal(new Set(cardsOf(r).map((t) => t.key)).size, 10);
});

test('Entdecker-Runde plus höchstens 5 fällige Karten anderer Reihen', () => {
  const s = newState(T);
  markDiscovered(s, 2);
  for (const key of rowKeys(2)) Object.assign(s.cards[key], { box: 2, due: T });
  s.rows[2].stage = 2;
  manualUnlock(s, 10);
  const r = buildDailyRound(s, T, seeded());
  assert.equal(r.discoverRow, 10);
  assert.deepEqual(r.tasks.slice(0, 10).map((t) => t.key), rowKeys(10));
  assert.equal(r.tasks.length, 15);
  assert.ok(r.tasks.slice(10).every((t) => t.key.endsWith('x2')));
});

test('fällige Karten kommen zuerst rein (max 8), Fokus-Reihe danach, Länge 15', () => {
  const s = newState(T);
  manualUnlock(s, 10);
  manualUnlock(s, 5);
  for (const n of [2, 10, 5]) markDiscovered(s, n);
  for (const key of rowKeys(2)) Object.assign(s.cards[key], { box: 2, due: T - 1 });
  Object.assign(s.cards['1x10'], { box: 1, due: T });
  Object.assign(s.cards['2x10'], { box: 1, due: T });
  const due = dueKeys(s, T);
  assert.equal(due.length, 12);
  const r = buildDailyRound(s, T, seeded(7));
  const keys = cardsOf(r).map((t) => t.key);
  assert.equal(keys.length, DAILY_SIZE);
  assert.equal(keys.filter((k) => due.includes(k)).length, 8);
  for (const k of due.slice(0, 8)) assert.ok(keys.includes(k), k);
  assert.equal(keys.filter((k) => k.endsWith('x5')).length, 7);
});

test('nie dieselbe Karte zweimal in der Aufgabenliste', () => {
  for (let seed = 1; seed < 40; seed++) {
    const rng = seeded(seed);
    const s = newState(T);
    for (const n of [10, 5, 1]) manualUnlock(s, n);
    for (const n of [2, 10, 5, 1]) markDiscovered(s, n);
    for (const key of Object.keys(s.cards)) {
      if (rng() < 0.5) Object.assign(s.cards[key], { box: 1 + Math.floor(rng() * 5), due: T - Math.floor(rng() * 3) });
    }
    const keys = cardsOf(buildDailyRound(s, T, rng)).map((t) => t.key);
    assert.equal(new Set(keys).size, keys.length);
  }
});

test('Reihe üben: Entdecker zuerst, danach gemischt', () => {
  const s = newState(T);
  const first = buildRowRound(s, 2, seeded());
  assert.equal(first.discoverRow, 2);
  assert.deepEqual(first.tasks.map((t) => t.key), rowKeys(2));
  markDiscovered(s, 2);
  const later = buildRowRound(s, 2, seeded(3));
  assert.equal(later.discoverRow, null);
  assert.deepEqual([...cardsOf(later).map((t) => t.key)].sort(), [...rowKeys(2)].sort());
  assert.notDeepEqual(cardsOf(later).map((t) => t.key), rowKeys(2));
});

test('swapped nie unter Gold, ab Gold manchmal', () => {
  const s = newState(T);
  markDiscovered(s, 2);
  s.rows[2].stage = 2;
  for (let i = 0; i < 30; i++) {
    assert.ok(buildRowRound(s, 2, seeded(i + 1)).tasks.every((t) => !t.swapped));
  }
  s.rows[2].stage = 3;
  const swaps = Array.from({ length: 30 }, (_, i) => buildRowRound(s, 2, seeded(i + 1)).tasks)
    .flat().filter((t) => t.swapped).length;
  assert.ok(swaps > 30 && swaps < 150, `swaps=${swaps}`);
});

test('Round: falsch wird 2–3 Plätze später wiederholt, höchstens 2×', () => {
  const tasks = ['1x2', '2x2', '3x2', '4x2', '5x2', '6x2'].map((key) => ({ key, swapped: false, hop: false }));
  const round = new Round(tasks, { rng: seeded(5) });
  assert.equal(round.current.key, '1x2');
  round.submit(false);
  const next = round.queue.slice(round.pos).map((t) => t.key);
  const idx = next.indexOf('1x2');
  assert.ok(idx === 2 || idx === 3, `idx=${idx}`);
  // immer falsch beantworten → 1x2 kommt insgesamt höchstens 3× (1 + 2 Wiederholungen)
  while (round.current) round.submit(round.current.key !== '1x2');
  assert.equal(round.results.filter((r) => r.key === '1x2').length, 3);
  assert.equal(round.total, 8);
});

test('Round: nach 2 Fehlern in Folge kommt eine easyPool-Karte', () => {
  const tasks = ['7x8', '6x8', '9x8', '8x8'].map((key) => ({ key, swapped: false, hop: false }));
  const round = new Round(tasks, { easyPool: ['10x2'], rng: seeded(2) });
  round.submit(false);
  round.submit(false);
  assert.equal(round.current.key, '10x2');
});

test('easyPool: sichere Karten offener Reihen, sonst 1er/10er-Aufgaben', () => {
  const s = newState(T);
  assert.deepEqual(easyPool(s).sort(), ['10x2', '1x2'].sort());
  Object.assign(s.cards['5x2'], { box: 3, due: T + 2 });
  assert.deepEqual(easyPool(s), ['5x2']);
});

test('Rekordjagd: nie zweimal dieselbe Karte hintereinander, nur offene Reihen', () => {
  const s = newState(T);
  manualUnlock(s, 10);
  const rng = seeded(9);
  let last = null;
  for (let i = 0; i < 200; i++) {
    const t = pickBlitzTask(s, rng, last);
    assert.notEqual(t.key, last);
    assert.ok(t.key.endsWith('x2') || t.key.endsWith('x10'));
    assert.equal(t.hop, false);
    last = t.key;
  }
});

test('cardKey stimmt mit rowKeys überein', () => {
  assert.equal(rowKeys(2)[6], cardKey(7, 2));
});

test('Quiz: keine Fragen in der Entdecker-Runde, auch nicht am Entdecker-Tag', () => {
  const s = newState(T);
  assert.equal(quizzesOf(buildDailyRound(s, T, seeded())).length, 0);
  assert.equal(quizzesOf(buildRowRound(s, 2, seeded())).length, 0);
  markDiscovered(s, 2);
  for (const key of rowKeys(2)) Object.assign(s.cards[key], { box: 2, due: T });
  s.rows[2].stage = 2;
  manualUnlock(s, 10);
  for (let seed = 1; seed <= 30; seed++) assert.equal(quizzesOf(buildDailyRound(s, T, seeded(seed))).length, 0);
});

test('Quiz: Tagestraining hat 1–2 Fragen zusätzlich, nie als erste oder zweite Aufgabe', () => {
  const counts = new Set();
  for (let seed = 1; seed <= 60; seed++) {
    const s = newState(T);
    manualUnlock(s, 10);
    manualUnlock(s, 5);
    for (const n of [2, 10, 5]) markDiscovered(s, n);
    const r = buildDailyRound(s, T, seeded(seed));
    const q = quizzesOf(r);
    counts.add(q.length);
    assert.ok(q.length >= 1 && q.length <= 2);
    assert.equal(cardsOf(r).length, DAILY_SIZE);
    r.tasks.forEach((t, i) => { if (t.quiz) assert.ok(i >= 2, `Quiz an Stelle ${i}`); });
    if (q.length === 2) assert.notDeepEqual([q[0].quiz.type, q[0].quiz.row], [q[1].quiz.type, q[1].quiz.row]);
  }
  assert.deepEqual([...counts].sort(), [1, 2]);
});

test('Quiz: Reihe üben hat genau 1 Frage zu dieser Reihe, die 1er-Reihe keine', () => {
  const s = newState(T);
  markDiscovered(s, 2);
  manualUnlock(s, 1);
  markDiscovered(s, 1);
  for (let seed = 1; seed <= 20; seed++) {
    const r = buildRowRound(s, 2, seeded(seed));
    assert.equal(quizzesOf(r).length, 1);
    assert.equal(quizzesOf(r)[0].quiz.row, 2);
    assert.equal(cardsOf(r).length, 10);
    assert.equal(quizzesOf(buildRowRound(s, 1, seeded(seed))).length, 0);
  }
});

test('Round: falsche Quizantwort wird nicht wiederholt und bringt keine Extra-Karte', () => {
  const quiz = { type: 'member', row: 2, choices: [7, 8, 9], answer: 1, mark: [8] };
  const tasks = [{ key: '7x8' }, { key: '6x8' }, { key: 'quiz', quiz }, { key: '9x8' }];
  const round = new Round(tasks, { easyPool: ['10x2'], rng: seeded(2) });
  round.submit(true);
  round.submit(false); // 6x8 falsch → kommt wieder
  const before = round.total;
  assert.ok(round.current.quiz);
  round.submit(false);
  assert.equal(round.total, before);
  assert.notEqual(round.current.key, '10x2');
  assert.equal(round.wrongCount, 2);
  assert.ok(round.results.at(-1).quiz);
});
