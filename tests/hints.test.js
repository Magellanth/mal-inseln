import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hintFor } from '../js/hints.js';

test('jede der 100 Aufgaben endet mit korrektem Ergebnis und hat einen Tipp', () => {
  for (let n = 1; n <= 10; n++) {
    for (let k = 1; k <= 10; k++) {
      const h = hintFor(k, n);
      assert.equal(h.lines.at(-1), `${k} · ${n} = ${k * n}`);
      assert.equal(h.result, k * n);
      assert.ok(h.tip && h.tip.length > 5, `${k}·${n}`);
      assert.equal(h.dots.rows, k);
      assert.equal(h.dots.cols, n);
    }
  }
});

test('Zwischenzeilen rechnen richtig', () => {
  for (let n = 1; n <= 10; n++) {
    for (let k = 1; k <= 10; k++) {
      for (const line of hintFor(k, n).lines) {
        const m = line.match(/(\d+) · (\d+) = (\d+)/);
        if (m) assert.equal(Number(m[1]) * Number(m[2]), Number(m[3]), line);
        const p = line.match(/^(\d+) \+ (\d+) = (\d+)$/);
        if (p) assert.equal(Number(p[1]) + Number(p[2]), Number(p[3]), line);
      }
    }
  }
});

test('7·6 nutzt 5·6 + 2·6, Punktefeld hebt 5 Reihen hervor', () => {
  const h = hintFor(7, 6);
  assert.ok(h.lines.includes('5 · 6 = 30'));
  assert.ok(h.lines.includes('+ 2 · 6 = 12'));
  assert.equal(h.dots.accentRows, 5);
  assert.equal(h.dots.ghostRows, 0);
});

test('9·4 nutzt 10·4 − 1·4, Punktefeld zeigt 1 hohle Reihe', () => {
  const h = hintFor(9, 4);
  assert.ok(h.lines.includes('10 · 4 = 40'));
  assert.ok(h.lines.includes('− 1 · 4 = 4'));
  assert.equal(h.dots.ghostRows, 1);
  assert.equal(h.dots.rows + h.dots.ghostRows, 10);
});

test('3·7 hebt die 2 Reihen von 2·7 hervor', () => {
  assert.equal(hintFor(3, 7).dots.accentRows, 2);
});

test('Kernreihen haben eigene Tricks', () => {
  assert.match(hintFor(7, 2).tip, /Verdoppeln/);
  assert.match(hintFor(7, 10).tip, /Zehner/);
  assert.match(hintFor(7, 5).tip, /Hälfte/);
  assert.match(hintFor(7, 1).tip, /Mal 1/);
});
