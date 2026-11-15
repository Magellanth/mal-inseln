// Rundenbau (Tagestraining, Reihe üben, Rekordjagd) und Rundenablauf mit Wiedervorlage falscher Aufgaben.

import { parseKey, rowKeys, rowStage, focusRow, isDiscovered, dueKeys, unlockedRows } from './model.js';

export const DAILY_SIZE = 15;
export const DUE_MAX = 8;
export const DISCOVER_EXTRA = 5;
export const SWAP_CHANCE = 0.25;
export const MAX_REPEATS = 2;

export function shuffle(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeTask(state, key, rng, { allowHop = true } = {}) {
  const { n } = parseKey(key);
  return {
    key,
    swapped: rowStage(state, n) >= 3 && rng() < SWAP_CHANCE,
    hop: allowHop && state.cards[key].box === 0,
  };
}

function discoveryTasks(state, n) {
  return rowKeys(n).map((key) => ({ key, swapped: false, hop: state.cards[key].box === 0 }));
}

// Schwächste zuerst; bei Gleichstand zufällig.
function byWeakness(state, keys, rng) {
  return shuffle(keys, rng).sort((a, b) => state.cards[a].box - state.cards[b].box);
}

export function buildDailyRound(state, today, rng = Math.random) {
  const focus = focusRow(state);
  const due = dueKeys(state, today);

  if (focus !== null && !isDiscovered(state, focus)) {
    const extra = due.filter((key) => parseKey(key).n !== focus).slice(0, DISCOVER_EXTRA);
    return {
      mode: 'daily',
      discoverRow: focus,
      tasks: [...discoveryTasks(state, focus), ...shuffle(extra, rng).map((key) => makeTask(state, key, rng))],
    };
  }

  const chosen = new Set(due.slice(0, DUE_MAX));
  if (focus !== null) {
    for (const key of byWeakness(state, rowKeys(focus), rng)) {
      if (chosen.size >= DAILY_SIZE) break;
      chosen.add(key);
    }
  }
  const rest = unlockedRows(state).flatMap(rowKeys).filter((key) => !chosen.has(key));
  for (const key of shuffle(rest, rng)) {
    if (chosen.size >= DAILY_SIZE) break;
    chosen.add(key);
  }
  return {
    mode: 'daily',
    discoverRow: null,
    tasks: shuffle([...chosen], rng).map((key) => makeTask(state, key, rng)),
  };
}

export function buildRowRound(state, n, rng = Math.random) {
  if (!isDiscovered(state, n)) return { mode: 'row', discoverRow: n, tasks: discoveryTasks(state, n) };
  return { mode: 'row', discoverRow: null, tasks: shuffle(rowKeys(n), rng).map((key) => makeTask(state, key, rng)) };
}

// Gewichtet zu niedrigen Fächern: Fach 0 → 6, Fach 5 → 1.
export function pickBlitzTask(state, rng = Math.random, lastKey = null) {
  const keys = unlockedRows(state).flatMap(rowKeys).filter((key) => key !== lastKey);
  const weights = keys.map((key) => 6 - state.cards[key].box);
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  let pick = keys[keys.length - 1];
  for (let i = 0; i < keys.length; i++) {
    r -= weights[i];
    if (r < 0) { pick = keys[i]; break; }
  }
  return makeTask(state, pick, rng, { allowHop: false });
}

// Sichere Karten für Erfolgserlebnisse nach Fehlern; anfangs die 1·n- und 10·n-Aufgaben.
export function easyPool(state) {
  const open = unlockedRows(state).flatMap(rowKeys);
  const safe = open.filter((key) => state.cards[key].box >= 2);
  if (safe.length) return safe;
  return open.filter((key) => [1, 10].includes(parseKey(key).k));
}

export class Round {
  constructor(tasks, { easyPool: pool = [], rng = Math.random } = {}) {
    this.queue = tasks.map((t) => ({ ...t }));
    this.pos = 0;
    this.repeats = {};
    this.streakWrong = 0;
    this.easyPool = pool;
    this.rng = rng;
    this.results = [];
  }

  get current() {
    return this.queue[this.pos] ?? null;
  }

  get done() {
    return this.pos;
  }

  get total() {
    return this.queue.length;
  }

  get finished() {
    return this.pos >= this.queue.length;
  }

  get wrongCount() {
    return this.results.filter((r) => !r.correct).length;
  }

  submit(correct, ms = 0) {
    const task = this.current;
    if (!task) return;
    this.results.push({ key: task.key, correct, ms });
    this.pos += 1;
    if (correct) {
      this.streakWrong = 0;
      return;
    }
    this.streakWrong += 1;
    const count = this.repeats[task.key] ?? 0;
    if (count < MAX_REPEATS) {
      this.repeats[task.key] = count + 1;
      const gap = 2 + Math.floor(this.rng() * 2);
      const at = Math.min(this.pos + gap, this.queue.length);
      this.queue.splice(at, 0, { key: task.key, swapped: false, hop: false });
    }
    if (this.streakWrong % 2 === 0) {
      const upcoming = new Set(this.queue.slice(this.pos).map((t) => t.key));
      const options = this.easyPool.filter((key) => !upcoming.has(key) && key !== task.key);
      if (options.length) {
        const key = options[Math.floor(this.rng() * options.length)];
        this.queue.splice(this.pos, 0, { key, swapped: false, hop: false, easy: true });
      }
    }
  }
}
