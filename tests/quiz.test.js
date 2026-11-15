import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState, manualUnlock, markDiscovered, ROW_ORDER } from '../js/model.js';
import { inRow, quizRows, makeQuiz } from '../js/quiz.js';

const T = 20000;

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

// Alle Reihen offen und entdeckt; Stufen nach Wunsch.
function allOpen(stage = 0) {
  const s = newState(T);
  for (const n of ROW_ORDER) {
    manualUnlock(s, n);
    markDiscovered(s, n);
    s.rows[n].stage = stage;
  }
  return s;
}

function checkQuiz(s, q) {
  assert.equal(q.choices.length, 3);
  assert.equal(new Set(q.choices).size, 3, `doppelte Antwort: ${q.choices}`);
  assert.ok(q.answer >= 0 && q.answer < 3);
  assert.notEqual(q.row, 1);
  assert.ok(s.rows[q.row].discovered);
  if (q.type === 'member') {
    const hits = q.choices.filter((x) => inRow(x, q.row));
    assert.deepEqual(hits, [q.choices[q.answer]], `${q.row}er: ${q.choices}`);
    for (const x of q.choices) {
      assert.ok(Number.isInteger(x) && x >= 2 && x <= 100, `außerhalb: ${x}`);
      if (x !== q.choices[q.answer]) assert.notEqual(x % q.row, 0, `${x} ist ein Vielfaches von ${q.row}`);
    }
    assert.deepEqual(q.mark, [q.choices[q.answer]]);
  } else if (q.type === 'notMember') {
    assert.ok(s.rows[q.row].stage >= 2);
    const odd = q.choices[q.answer];
    assert.notEqual(odd % q.row, 0, `${odd} ist ein Vielfaches von ${q.row}`);
    assert.ok(odd >= 2 && odd <= 100);
    const members = q.choices.filter((x) => x !== odd);
    assert.ok(members.every((x) => inRow(x, q.row)), `${q.row}er: ${q.choices}`);
    assert.deepEqual([...q.mark].sort((a, b) => a - b), [...members].sort((a, b) => a - b));
  } else if (q.type === 'whichRow') {
    assert.ok(Number.isInteger(q.number));
    assert.equal(q.choices[q.answer], q.row);
    const fits = q.choices.filter((m) => inRow(q.number, m));
    assert.deepEqual(fits, [q.row], `${q.number} passt in ${fits}`);
    // keine Falle über den Bereich: 100 ist gerade, darf also nicht mit der 2er-Reihe als „falsch“ kommen
    const divides = q.choices.filter((m) => q.number % m === 0);
    assert.deepEqual(divides, [q.row], `${q.number} ist teilbar durch ${divides}`);
    for (const m of q.choices) {
      assert.notEqual(m, 1);
      assert.ok(s.rows[m].discovered);
    }
    assert.deepEqual(q.choices, [...q.choices].sort((a, b) => a - b));
    assert.deepEqual(q.mark, [q.number]);
  } else {
    assert.fail(`unbekannter Typ ${q.type}`);
  }
}

test('inRow: nur Ergebnisse 1·n bis 10·n', () => {
  assert.ok(inRow(27, 3));
  assert.ok(inRow(3, 3));
  assert.ok(inRow(30, 3));
  assert.ok(!inRow(33, 3));
  assert.ok(!inRow(28, 3));
  assert.ok(!inRow(0, 3));
});

test('quizRows: nur entdeckte Reihen, nie die 1er', () => {
  const s = newState(T);
  assert.deepEqual(quizRows(s), []);
  markDiscovered(s, 2);
  manualUnlock(s, 1);
  markDiscovered(s, 1);
  manualUnlock(s, 10);
  assert.deepEqual(quizRows(s), [2]);
});

test('keine Frage ohne entdeckte Reihe (außer der 1er)', () => {
  const s = newState(T);
  assert.equal(makeQuiz(s, seeded()), null);
  manualUnlock(s, 1);
  markDiscovered(s, 1);
  assert.equal(makeQuiz(s, seeded()), null);
  assert.equal(makeQuiz(s, seeded(), { row: 1 }), null);
  assert.equal(makeQuiz(s, seeded(), { row: 2 }), null); // 2er noch nicht entdeckt
});

test('alle Fragen haben genau eine passende Antwort (viele Zufallsläufe)', () => {
  for (const stage of [0, 2, 4]) {
    const s = allOpen(stage);
    for (let seed = 1; seed <= 400; seed++) {
      const q = makeQuiz(s, seeded(seed));
      assert.ok(q);
      checkQuiz(s, q);
    }
    for (const n of ROW_ORDER.filter((m) => m !== 1)) {
      for (let seed = 1; seed <= 60; seed++) {
        const q = makeQuiz(s, seeded(seed * 7), { row: n });
        checkQuiz(s, q);
        assert.equal(q.row, n);
        assert.notEqual(q.type, 'whichRow');
      }
    }
  }
});

test('anfangs nur 2er entdeckt: nur „gehört in die 2er-Reihe“', () => {
  const s = newState(T);
  markDiscovered(s, 2);
  for (let seed = 1; seed <= 100; seed++) {
    const q = makeQuiz(s, seeded(seed));
    checkQuiz(s, q);
    assert.equal(q.type, 'member');
    assert.equal(q.row, 2);
  }
});

test('„nicht“-Fragen erst ab Silber, „welche Reihe“ erst ab 3 Reihen', () => {
  const s = newState(T);
  for (const n of [10, 5]) manualUnlock(s, n);
  for (const n of [2, 10]) markDiscovered(s, n);
  const types = new Set(Array.from({ length: 200 }, (_, i) => makeQuiz(s, seeded(i + 1)).type));
  assert.deepEqual([...types], ['member']);

  s.rows[10].stage = 2;
  markDiscovered(s, 5);
  const seen = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    const q = makeQuiz(s, seeded(seed));
    checkQuiz(s, q);
    seen.add(q.type);
    if (q.type === 'notMember') assert.equal(q.row, 10);
  }
  assert.deepEqual([...seen].sort(), ['member', 'notMember', 'whichRow']);
});

test('Ablenker liegen oft knapp neben der richtigen Zahl', () => {
  const s = allOpen(0);
  let near = 0;
  let total = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const q = makeQuiz(s, seeded(seed));
    if (q.type !== 'member') continue;
    total += 1;
    const right = q.choices[q.answer];
    if (q.choices.some((x) => x !== right && Math.abs(x - right) <= 2)) near += 1;
  }
  assert.ok(total > 50);
  assert.ok(near / total > 0.8, `nur ${near} von ${total} knapp daneben`);
});
