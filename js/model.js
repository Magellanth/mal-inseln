// Lernmodell: Karten in Fächern (Karteikasten), Stufen je Reihe, Freischaltung, Fokus-Reihe.
// Reine Logik ohne DOM – wird mit node --test geprüft.

import { weekStart } from './days.js';

export const ROW_ORDER = [2, 10, 5, 1, 4, 8, 3, 6, 9, 7];
export const INTERVALS = { 1: 1, 2: 1, 3: 3, 4: 7, 5: 21 };
export const FAST_MS = 5000;
export const MAX_BOX = 5;
export const STAGE_MIN_BOX = { 1: 1, 2: 2, 3: 4, 4: 5 };
export const STAGE_NAMES = ['Neu', 'Bronze', 'Silber', 'Gold', 'Meister'];
export const SCHEMA_VERSION = 1;

export function cardKey(k, n) {
  return `${k}x${n}`;
}

export function parseKey(key) {
  const [k, n] = key.split('x').map(Number);
  return { k, n };
}

export function rowKeys(n) {
  const keys = [];
  for (let k = 1; k <= 10; k++) keys.push(cardKey(k, n));
  return keys;
}

function freshCard() {
  return { box: 0, due: null, right: 0, wrong: 0, lastMs: null };
}

export function newState(today) {
  const cards = {};
  const rows = {};
  for (const n of ROW_ORDER) {
    rows[n] = { open: false, seq: 0, stage: 0, discovered: false, manual: false };
    for (const key of rowKeys(n)) cards[key] = freshCard();
  }
  const state = {
    v: SCHEMA_VERSION,
    name: '',
    onboarded: false,
    created: today,
    seq: 0,
    cards,
    rows,
    stickers: {},
    weeks: {},
    days: {},
    stats: { tasks: 0, right: 0, streak: 0, bestStreak: 0, rounds: 0, perfectRounds: 0, quizRight: 0, quizTotal: 0 },
    records: { blitz: 0 },
    settings: { sound: true, installHint: true, dayGoal: DAY_GOAL_DEFAULT },
    backupDay: null,
  };
  openRow(state, ROW_ORDER[0], false);
  return state;
}

function openRow(state, n, manual) {
  const row = state.rows[n];
  if (row.open) return false;
  state.seq += 1;
  row.open = true;
  row.seq = state.seq;
  row.manual = manual;
  return true;
}

export function unlockedRows(state) {
  return ROW_ORDER.filter((n) => state.rows[n].open);
}

export function isOpen(state, n) {
  return state.rows[n].open;
}

export function rowStage(state, n) {
  return state.rows[n].stage;
}

function computedStage(state, n) {
  const min = Math.min(...rowKeys(n).map((key) => state.cards[key].box));
  let stage = 0;
  for (const s of [1, 2, 3, 4]) if (min >= STAGE_MIN_BOX[s]) stage = s;
  return stage;
}

// Hebt die gespeicherte Stufe an (nie ab) und liefert jede neu erreichte Stufe einzeln.
function updateStage(state, n) {
  const row = state.rows[n];
  const target = computedStage(state, n);
  const ups = [];
  while (row.stage < target) {
    row.stage += 1;
    ups.push({ row: n, stage: row.stage });
  }
  return ups;
}

// Wenn alle offenen Reihen mindestens Silber haben, geht die nächste gesperrte Reihe auf.
function checkUnlocks(state) {
  const unlocked = [];
  for (;;) {
    const open = unlockedRows(state);
    if (open.some((n) => state.rows[n].stage < 2)) break;
    const next = ROW_ORDER.find((n) => !state.rows[n].open);
    if (next === undefined) break;
    openRow(state, next, false);
    unlocked.push(next);
  }
  return unlocked;
}

export function manualUnlock(state, n) {
  if (!openRow(state, n, true)) return false;
  return true;
}

// Zuletzt geöffnete Reihe, die noch nicht Silber hat.
export function focusRow(state) {
  let best = null;
  for (const n of unlockedRows(state)) {
    const row = state.rows[n];
    if (row.stage < 2 && (best === null || row.seq > state.rows[best].seq)) best = n;
  }
  return best;
}

export function isDiscovered(state, n) {
  return state.rows[n].discovered;
}

export function markDiscovered(state, n) {
  state.rows[n].discovered = true;
}

export function isDue(card, today) {
  return card.box >= 1 && card.due !== null && card.due <= today;
}

export function dueKeys(state, today) {
  const keys = [];
  for (const n of unlockedRows(state)) {
    for (const key of rowKeys(n)) if (isDue(state.cards[key], today)) keys.push(key);
  }
  return keys.sort((a, b) => {
    const ca = state.cards[a];
    const cb = state.cards[b];
    return ca.due - cb.due || ca.box - cb.box;
  });
}

// Karten einer offenen Reihe, die geübt werden wollen (fällig oder zuletzt falsch).
export function rowWeakCount(state, n, today) {
  if (!state.rows[n].open) return 0;
  return rowKeys(n).filter((key) => isDue(state.cards[key], today)).length;
}

export function ensureDay(state, today) {
  if (!state.days[today]) state.days[today] = { tasks: 0, right: 0, rounds: 0, daily: 0 };
  return state.days[today];
}

export function practiceDays(state) {
  return Object.values(state.days).filter((d) => d.tasks > 0).length;
}

// Tagesziel: eine einstellbare Zahl richtig gelöster Aufgaben am Tag (Raten zählt nicht). Das ist auch der Wochen-Stempel.
// Einmal erreicht, bleibt der Tag erreicht (day.goal), auch wenn die Eltern das Ziel später erhöhen.
export const DAY_GOAL_DEFAULT = 30;
export const DAY_GOAL_OPTIONS = [20, 30, 40, 50];
export const WEEK_GOAL_DAYS = 4;

export function dayGoalTarget(state) {
  const goal = Number(state.settings?.dayGoal);
  return DAY_GOAL_OPTIONS.includes(goal) ? goal : DAY_GOAL_DEFAULT;
}

export function dayGoalReached(state, day) {
  const d = state.days[day];
  return !!d && (d.goal === true || d.right >= dayGoalTarget(state));
}

export function dayProgress(state, day) {
  return { right: state.days[day]?.right ?? 0, target: dayGoalTarget(state), reached: dayGoalReached(state, day) };
}

export function goalDays(state) {
  return Object.keys(state.days).filter((d) => dayGoalReached(state, Number(d))).length;
}

export function weekGoalDays(state, today) {
  const start = weekStart(today);
  let count = 0;
  for (let d = start; d < start + 7; d++) if (dayGoalReached(state, d)) count += 1;
  return count;
}

export function recordRound(state, { mode, perfect, today }) {
  const day = ensureDay(state, today);
  day.rounds += 1;
  state.stats.rounds += 1;
  if (perfect) state.stats.perfectRounds += 1;
  if (mode === 'daily') day.daily += 1;
}

export function applyAnswer(state, key, { correct, ms, today }) {
  const card = state.cards[key];
  const { n } = parseKey(key);
  const oldBox = card.box;
  const day = ensureDay(state, today);
  day.tasks += 1;
  state.stats.tasks += 1;
  card.lastMs = ms;

  if (correct) {
    card.right += 1;
    day.right += 1;
    state.stats.right += 1;
    state.stats.streak += 1;
    state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.streak);
    const fast = ms <= FAST_MS;
    let newBox = oldBox;
    if (oldBox < 2) newBox = oldBox + 1;
    else if (fast && isDue(card, today)) newBox = Math.min(oldBox + 1, MAX_BOX);
    if (newBox !== oldBox || (oldBox === MAX_BOX && isDue(card, today) && fast)) {
      card.box = newBox;
      card.due = today + INTERVALS[newBox];
    }
  } else {
    card.wrong += 1;
    state.stats.streak = 0;
    card.box = Math.min(oldBox, 1);
    card.due = card.box >= 1 ? today : null;
  }

  const goalReached = checkDayGoal(state, day);
  const stageUps = updateStage(state, n);
  const unlocked = checkUnlocks(state);
  return { oldBox, newBox: card.box, stageUps, unlocked, goalReached };
}

// Meldet true genau einmal: in dem Moment, in dem das Tagesziel erreicht wird.
function checkDayGoal(state, day) {
  if (day.goal || day.right < dayGoalTarget(state)) return false;
  day.goal = true;
  return true;
}

// Quizfrage beantwortet: zählt fürs Tagesziel, ändert aber keine Karte, Stufe oder Serie.
export function recordQuiz(state, { correct, today }) {
  const day = ensureDay(state, today);
  day.tasks += 1;
  state.stats.tasks += 1;
  state.stats.quizTotal += 1;
  if (correct) {
    day.right += 1;
    state.stats.right += 1;
    state.stats.quizRight += 1;
  }
  return { goalReached: checkDayGoal(state, day) };
}
