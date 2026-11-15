// Sticker-Katalog und Vergabe. syncStickers prüft den Spielstand und vergibt alles Verdiente, was noch fehlt –
// so geht nichts verloren, wenn eine Runde abgebrochen wird.

import { ROW_ORDER, unlockedRows, goalDays, dayGoalReached, weekGoalDays, WEEK_GOAL_DAYS } from './model.js';
import { weekStart } from './days.js';

// Je Reihe eine Themenwelt mit 4 Stickern (Bronze, Silber, Gold, Meister = Glitzer).
export const ROW_THEMES = {
  2: { title: 'Korallenriff', icon: '🐳', color: '#ff9aa8', items: [['🐚', 'Muschel'], ['🐠', 'Tropenfisch'], ['🐙', 'Krake'], ['🐳', 'Wal']] },
  10: { title: 'Weltall', icon: '🚀', color: '#7d72e0', items: [['🌙', 'Mond'], ['☄️', 'Komet'], ['🚀', 'Rakete'], ['🛸', 'Ufo']] },
  5: { title: 'Wald', icon: '🦉', color: '#5cb04f', items: [['🍄', 'Pilz'], ['🦔', 'Igel'], ['🦉', 'Eule'], ['🦊', 'Fuchs']] },
  1: { title: 'Bauernhof', icon: '🐮', color: '#f0a04b', items: [['🐣', 'Küken'], ['🐷', 'Schwein'], ['🐮', 'Kuh'], ['🦄', 'Einhorn']] },
  4: { title: 'Dschungel', icon: '🐒', color: '#2fb889', items: [['🐸', 'Frosch'], ['🦜', 'Papagei'], ['🐒', 'Affe'], ['🐯', 'Tiger']] },
  8: { title: 'Savanne', icon: '🦁', color: '#e2b23d', items: [['🦒', 'Giraffe'], ['🦓', 'Zebra'], ['🐘', 'Elefant'], ['🦁', 'Löwe']] },
  3: { title: 'Eiswelt', icon: '🐧', color: '#f4fbff', items: [['❄️', 'Schneeflocke'], ['⛄', 'Schneemann'], ['🐧', 'Pinguin'], ['🐺', 'Wolf']] },
  6: { title: 'Wüste', icon: '🌵', color: '#eb8f55', items: [['🌵', 'Kaktus'], ['🦂', 'Skorpion'], ['🦎', 'Eidechse'], ['🐫', 'Kamel']] },
  9: { title: 'Dino-Vulkan', icon: '🌋', color: '#e0634f', items: [['🌋', 'Vulkan'], ['🦴', 'Dino-Knochen'], ['🦕', 'Langhals'], ['🦖', 'T-Rex']] },
  7: { title: 'Drachenburg', icon: '🏰', color: '#a865d6', items: [['🏰', 'Burg'], ['🛡️', 'Schild'], ['👑', 'Krone'], ['🐉', 'Drache']] },
};

const DAY_ITEMS = [
  ['🍕', 'Pizza'], ['🍩', 'Donut'], ['🍦', 'Eis'], ['🧁', 'Muffin'], ['🍉', 'Melone'], ['🍓', 'Erdbeere'],
  ['🍌', 'Banane'], ['🍒', 'Kirschen'], ['🥨', 'Brezel'], ['🍪', 'Keks'], ['🍿', 'Popcorn'], ['🚗', 'Auto'],
  ['🚂', 'Lok'], ['🚁', 'Hubschrauber'], ['⛵', 'Segelboot'], ['🛴', 'Roller'], ['🚲', 'Fahrrad'], ['⚽', 'Fußball'],
  ['🏀', 'Basketball'], ['🎸', 'Gitarre'], ['🎨', 'Farben'], ['🎈', 'Luftballon'], ['🎁', 'Geschenk'], ['🌈', 'Regenbogen'],
  ['🌻', 'Sonnenblume'], ['🧩', 'Puzzle'], ['🎮', 'Spielkonsole'], ['🌸', 'Blüte'],
];

const WEEK_ITEMS = [
  ['🦋', 'Schmetterling'], ['🐝', 'Biene'], ['🐞', 'Marienkäfer'], ['🐢', 'Schildkröte'], ['🐬', 'Delfin'], ['🦈', 'Hai'],
  ['🐼', 'Panda'], ['🐨', 'Koala'], ['🦘', 'Känguru'], ['🦚', 'Pfau'], ['🐿️', 'Eichhörnchen'], ['🦀', 'Krebs'],
];

export const SPECIALS = [
  { id: 'sp-first', emoji: '🏁', name: 'Erste Runde', how: 'Deine erste Runde geschafft' },
  { id: 'sp-perfect', emoji: '💯', name: 'Fehlerfrei', how: 'Eine Runde ganz ohne Fehler' },
  { id: 'sp-streak10', emoji: '⚡', name: 'Blitzschnell', how: '10 richtig hintereinander' },
  { id: 'sp-streak25', emoji: '🌟', name: 'Superstar', how: '25 richtig hintereinander' },
  { id: 'sp-days5', emoji: '📅', name: '5 Übungstage', how: 'An 5 Tagen das Tagesziel geschafft' },
  { id: 'sp-days15', emoji: '🏅', name: '15 Übungstage', how: 'An 15 Tagen das Tagesziel geschafft' },
  { id: 'sp-days30', emoji: '🏆', name: '30 Übungstage', how: 'An 30 Tagen das Tagesziel geschafft' },
  { id: 'sp-wackel', emoji: '💪', name: 'Wackel-Aufgabe besiegt', how: 'Eine schwere Aufgabe richtig sicher gemacht' },
  { id: 'sp-record', emoji: '⏱️', name: 'Neuer Rekord', how: 'Deinen Rekord in der Rekordjagd geknackt' },
  { id: 'sp-quiz10', emoji: '🔍', name: 'Zahlen-Detektiv', how: '10 Quizfragen richtig beantwortet' },
  { id: 'sp-allopen', emoji: '🗺️', name: 'Weltenbummler', how: 'Alle zehn Reihen freigeschaltet' },
  { id: 'sp-allmaster', emoji: '💎', name: 'Einmaleins-Meister', how: 'Alle Reihen auf Meister', holo: true },
];

export const FALLBACK_EMOJI = '⭐';

function buildCatalogue() {
  const list = [];
  for (const n of ROW_ORDER) {
    const theme = ROW_THEMES[n];
    theme.items.forEach(([emoji, name], i) => {
      list.push({ id: `row-${n}-${i + 1}`, emoji, name, group: `row-${n}`, row: n, stage: i + 1, holo: i === 3, tint: theme.color });
    });
  }
  DAY_ITEMS.forEach(([emoji, name], i) => list.push({ id: `day-${i + 1}`, emoji, name, group: 'day', tint: '#ffc83d' }));
  WEEK_ITEMS.forEach(([emoji, name], i) => list.push({ id: `week-${i + 1}`, emoji, name, group: 'week', holo: true }));
  for (const sp of SPECIALS) list.push({ tint: '#5fd08f', ...sp, group: 'special' });
  return list.map((s) => ({ fallback: FALLBACK_EMOJI, holo: false, ...s }));
}

export const STICKERS = buildCatalogue();
export const STICKER_BY_ID = Object.fromEntries(STICKERS.map((s) => [s.id, s]));

export const GROUPS = [
  ...ROW_ORDER.map((n) => ({ id: `row-${n}`, title: `${ROW_THEMES[n].title} · ${n}er-Reihe`, row: n })),
  { id: 'week', title: 'Wochen-Sticker' },
  { id: 'day', title: 'Tages-Sticker' },
  { id: 'special', title: 'Besondere Sticker' },
];

export function stickersInGroup(group) {
  return STICKERS.filter((s) => s.group === group);
}

export function ownedCount(state) {
  return Object.keys(state.stickers).filter((id) => STICKER_BY_ID[id]).length;
}

function give(state, id, today, out) {
  if (state.stickers[id]) return false;
  state.stickers[id] = { day: today, fresh: true };
  out.push(id);
  return true;
}

function randomMissing(state, group, rng) {
  const missing = stickersInGroup(group).filter((s) => !state.stickers[s.id]);
  if (!missing.length) return null;
  return missing[Math.floor(rng() * missing.length)].id;
}

// flags: { perfectRound?: boolean, blitzRecord?: boolean }
export function syncStickers(state, today, rng = Math.random, flags = {}) {
  const out = [];

  for (const n of ROW_ORDER) {
    for (let stage = 1; stage <= state.rows[n].stage; stage++) give(state, `row-${n}-${stage}`, today, out);
  }

  if (state.stats.rounds >= 1) give(state, 'sp-first', today, out);
  if (flags.perfectRound || state.stats.perfectRounds >= 1) give(state, 'sp-perfect', today, out);
  if (state.stats.bestStreak >= 10) give(state, 'sp-streak10', today, out);
  if (state.stats.bestStreak >= 25) give(state, 'sp-streak25', today, out);
  const days = goalDays(state);
  if (days >= 5) give(state, 'sp-days5', today, out);
  if (days >= 15) give(state, 'sp-days15', today, out);
  if (days >= 30) give(state, 'sp-days30', today, out);
  if (Object.values(state.cards).some((c) => c.wrong >= 3 && c.box >= 4)) give(state, 'sp-wackel', today, out);
  if (flags.blitzRecord) give(state, 'sp-record', today, out);
  if (state.stats.quizRight >= 10) give(state, 'sp-quiz10', today, out);
  if (unlockedRows(state).length === ROW_ORDER.length) give(state, 'sp-allopen', today, out);
  if (ROW_ORDER.every((n) => state.rows[n].stage >= 4)) give(state, 'sp-allmaster', today, out);

  // Tages- und Wochen-Sticker für jeden Tag/jede Woche mit erreichtem Ziel – auch nachträglich,
  // falls die App mitten in der Runde geschlossen und erst später wieder geöffnet wurde.
  const goalDayList = Object.keys(state.days).map(Number).filter((d) => dayGoalReached(state, d)).sort((a, b) => a - b);
  for (const d of goalDayList) {
    const day = state.days[d];
    if (day.sticker) continue;
    const id = randomMissing(state, 'day', rng);
    day.sticker = id ?? 'none';
    if (id) give(state, id, d, out);
  }
  for (const ws of new Set(goalDayList.map(weekStart))) {
    if (state.weeks[ws] || weekGoalDays(state, ws) < WEEK_GOAL_DAYS) continue;
    const id = randomMissing(state, 'week', rng);
    state.weeks[ws] = id ?? 'none';
    if (id) give(state, id, ws + 6 < today ? ws + 6 : today, out);
  }

  return out;
}
