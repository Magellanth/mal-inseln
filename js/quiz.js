// Quizfragen als kleine Beimischung: Ergebnisse einer Reihe wiedererkennen, Antwort antippen.
// „In der Reihe“ heißt: eines der Ergebnisse 1·n … 10·n. Die 1er-Reihe bleibt außen vor (dort passt jede Zahl bis 10).
// Quizfragen ändern keine Fächer oder Stufen.

import { ROW_ORDER } from './model.js';

const MIN_ROWS_WHICH = 3;
const ATTEMPTS = 20;

export function inRow(x, n) {
  return Number.isInteger(x) && x % n === 0 && x / n >= 1 && x / n <= 10;
}

export function quizRows(state) {
  return ROW_ORDER.filter((n) => n !== 1 && state.rows[n].open && state.rows[n].discovered);
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

function shuffled(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Ergebnis k·n mit k = 2 … 10 (k = 1 wäre die Reihenzahl selbst, zu leicht).
function randomResult(n, rng) {
  return (2 + Math.floor(rng() * 9)) * n;
}

// Zahlen, die in keiner Weise zur Reihe n gehören (keine Vielfachen), im Bereich der Reihe.
function outsider(n, x) {
  return Number.isInteger(x) && x >= 2 && x <= 10 * n && x % n !== 0;
}

// Knapp daneben: 1 oder 2 neben einer der Zahlen.
function nearMiss(n, around, rng, taken) {
  const options = around.flatMap((x) => [x - 1, x + 1, x - 2, x + 2])
    .filter((x) => outsider(n, x) && !taken.includes(x));
  return options.length ? pick(options, rng) : null;
}

// Verlockend: ein Ergebnis einer anderen Reihe, das nicht in die Reihe n gehört.
function otherRowNumber(n, rng, taken) {
  const options = [];
  for (let m = 2; m <= 9; m++) {
    if (m === n) continue;
    for (let k = 1; k <= 10; k++) {
      const x = k * m;
      if (outsider(n, x) && !taken.includes(x) && !options.includes(x)) options.push(x);
    }
  }
  return options.length ? pick(options, rng) : null;
}

function anyOutsider(n, rng, taken) {
  const options = [];
  for (let x = 2; x <= 10 * n; x++) if (outsider(n, x) && !taken.includes(x)) options.push(x);
  return pick(options, rng);
}

function withAnswer(type, row, right, others, rng, extra = {}) {
  const choices = shuffled([right, ...others], rng);
  return { type, row, choices, answer: choices.indexOf(right), ...extra };
}

function memberQuiz(n, rng) {
  const right = randomResult(n, rng);
  const near = nearMiss(n, [right], rng, [right]) ?? anyOutsider(n, rng, [right]);
  const other = otherRowNumber(n, rng, [right, near]) ?? anyOutsider(n, rng, [right, near]);
  return withAnswer('member', n, right, [near, other], rng, { mark: [right] });
}

function notMemberQuiz(n, rng) {
  const a = randomResult(n, rng);
  let b = randomResult(n, rng);
  while (b === a) b = randomResult(n, rng);
  const odd = nearMiss(n, [a, b], rng, [a, b]) ?? anyOutsider(n, rng, [a, b]);
  return withAnswer('notMember', n, odd, [a, b], rng, { mark: [a, b].sort((x, y) => x - y) });
}

function whichRowQuiz(rows, rng) {
  for (let i = 0; i < ATTEMPTS; i++) {
    const n = pick(rows, rng);
    const x = randomResult(n, rng);
    // Falsche Reihen teilen die Zahl gar nicht – sonst wäre z. B. „100 in der 2er-Reihe“ eine Falle (100 ist gerade).
    const others = rows.filter((m) => m !== n && x % m !== 0);
    if (others.length < 2) continue;
    const pair = shuffled(others, rng).slice(0, 2);
    const choices = [n, ...pair].sort((p, q) => p - q);
    return { type: 'whichRow', row: n, number: x, choices, answer: choices.indexOf(n), mark: [x] };
  }
  return null;
}

// Eine Quizfrage zu den entdeckten Reihen, mit { row } nur zu dieser Reihe. null, wenn nichts passt.
export function makeQuiz(state, rng = Math.random, { row = null } = {}) {
  const rows = row === null ? quizRows(state) : quizRows(state).filter((n) => n === row);
  if (!rows.length) return null;
  const silver = rows.filter((n) => state.rows[n].stage >= 2);
  const types = ['member'];
  if (silver.length) types.push('notMember');
  if (row === null && rows.length >= MIN_ROWS_WHICH) types.push('whichRow');
  const type = pick(types, rng);
  if (type === 'notMember') return notMemberQuiz(pick(silver, rng), rng);
  if (type === 'whichRow') return whichRowQuiz(rows, rng) ?? memberQuiz(pick(rows, rng), rng);
  return memberQuiz(pick(rows, rng), rng);
}

// Kurze Erklärung nach einer falschen Antwort.
export function quizExplain(q) {
  if (q.type === 'notMember') return `${q.choices[q.answer]} kommt in der ${q.row}er-Reihe nicht vor.`;
  const x = q.type === 'whichRow' ? q.number : q.choices[q.answer];
  return `${x} = ${x / q.row} · ${q.row}`;
}
