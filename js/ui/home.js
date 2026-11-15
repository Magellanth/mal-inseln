// Startbildschirm: Begrüßung, Tagestraining, Wochen-Stempel, Inselkarte, Rekordjagd.

import { h, add, svg, toast } from './dom.js';
import { app, go, today, onLeave, persist } from './core.js';
import { medals, isStandalone, isIOS, emojiOk } from './widgets.js';
import {
  ROW_ORDER, STAGE_NAMES, unlockedRows, focusRow, isDiscovered, dueKeys, rowWeakCount,
  dayGoalReached, dayProgress, weekGoalDays, WEEK_GOAL_DAYS,
} from '../model.js';
import { ROW_THEMES } from '../stickers.js';
import { weekStart } from '../days.js';
import { backupDue } from './parents.js';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function statusText(s, t) {
  const focus = focusRow(s);
  if (focus !== null && !isDiscovered(s, focus)) return `Heute: die ${focus}er-Insel entdecken.`;
  const due = dueKeys(s, t).length;
  if (due === 1) return '1 Aufgabe will wiederholt werden.';
  if (due > 1) return `${due} Aufgaben wollen wiederholt werden.`;
  if (dayGoalReached(s, t)) return 'Tagesziel geschafft! Eine Runde extra geht immer.';
  if (focus !== null) return `Weiter geht’s auf der ${focus}er-Insel.`;
  return 'Bereit für dein Training?';
}

export function goalBar(s, t) {
  const { right, target, reached } = dayProgress(s, t);
  const shown = Math.min(right, target);
  return h('div', { class: `goal ${reached ? 'done' : ''}`, role: 'img', 'aria-label': reached ? 'Tagesziel geschafft' : `Tagesziel: ${shown} von ${target} richtig` },
    h('div', { class: 'goal-head' },
      h('span', {}, 'Tagesziel'),
      h('b', {}, reached ? 'geschafft!' : `${shown} von ${target} richtig`)),
    h('div', { class: 'goal-bar' }, h('i', { style: { width: `${reached ? 100 : (shown / target) * 100}%` } })));
}

function weekCard(s, t) {
  const start = weekStart(t);
  const stamps = WEEKDAYS.map((label, i) => {
    const d = start + i;
    const on = dayGoalReached(s, d);
    const mark = svg('svg', { viewBox: '0 0 24 24', width: '60%', height: '60%' });
    mark.append(svg('path', { d: 'M5 12.5l4.5 4.5L19 7.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '3.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    return h('div', { class: `stamp ${on ? 'on' : ''} ${d === t ? 'today' : ''}` },
      h('i', { 'aria-hidden': 'true' }, on && mark),
      h('span', {}, label));
  });
  const got = weekGoalDays(s, t);
  const rest = Math.max(0, WEEK_GOAL_DAYS - got);
  let note;
  if (s.weeks[start]) note = 'Wochen-Sticker geschafft!';
  else note = rest === 1 ? 'Noch 1 Tag bis zum Wochen-Sticker' : `Noch ${rest} Tage bis zum Wochen-Sticker`;
  return h('section', { class: 'card week', 'aria-label': `Diese Woche: ${got} Übungstage` },
    h('div', { class: 'week-head' }, h('h3', {}, 'Deine Woche'), h('p', { class: 'soft' }, note)),
    h('div', { class: 'stamps' }, stamps));
}

function island(s, n, i, t, focus, nextLocked) {
  const theme = ROW_THEMES[n];
  const open = s.rows[n].open;
  const stage = s.rows[n].stage;
  const due = open ? rowWeakCount(s, n, t) : 0;
  const icon = emojiOk(theme.icon) ? theme.icon : '⭐';
  const label = open
    ? `${theme.title}, ${n}er-Reihe, Stufe ${STAGE_NAMES[stage]}${due ? `, ${due} zum Wiederholen` : ''}`
    : `${theme.title}, ${n}er-Reihe, noch gesperrt`;
  const btn = h('button', {
    class: `isle ${open ? '' : 'locked'} ${n === nextLocked ? 'next' : ''}`,
    style: { '--world': theme.color },
    'aria-label': label,
    onclick: () => {
      if (open) go('row', { row: n });
      else toast('Hol dir Silber auf deinen offenen Inseln – dann geht die nächste auf.');
    },
  },
  h('span', { class: `land shape-${i % 4}` },
    h('span', { class: 'emoji', 'aria-hidden': 'true' }, icon),
    h('span', { class: 'sign' }, `${n}er`),
    due > 0 && h('span', { class: 'due', 'aria-hidden': 'true' }, due),
    n === focus && h('span', { class: 'boat', 'aria-hidden': 'true' }, '⛵')),
  h('span', { class: 'name' }, theme.title),
  medals(stage));
  return h('div', { class: 'isle-row' }, btn);
}

// Gepunktete Route von Insel zu Insel, nach dem Layout berechnet.
function drawRoute(map) {
  const old = map.querySelector('svg.route');
  old?.remove();
  const box = map.getBoundingClientRect();
  const pts = [...map.querySelectorAll('.land')].map((el) => {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
  });
  if (pts.length < 2) return;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const my = (y0 + y1) / 2;
    d += ` C${x0},${my} ${x1},${my} ${x1},${y1}`;
  }
  const el = svg('svg', { class: 'route', viewBox: `0 0 ${box.width} ${box.height}`, 'aria-hidden': 'true' });
  el.append(svg('path', { d }));
  map.prepend(el);
}

function installCard(s) {
  if (isStandalone() || s.settings.installHint === false) return null;
  const how = isIOS()
    ? 'In Safari unten auf „Teilen“ tippen, dann „Zum Home-Bildschirm“.'
    : 'Im Browser-Menü (⋮) auf „App installieren“ oder „Zum Startbildschirm hinzufügen“ tippen.';
  return h('section', { class: 'card install' },
    h('h3', {}, 'Für Eltern: als App aufs Handy legen'),
    h('p', {}, 'Dann startet Mal-Inseln mit eigenem Symbol, läuft ohne Internet und der Browser löscht den Fortschritt nicht.'),
    h('p', {}, how),
    isIOS() && s.stats.tasks > 0 && h('p', {}, h('b', {}, 'Wichtig auf dem iPhone: '),
      'Die App auf dem Home-Bildschirm hat einen eigenen Speicher. Darum vorher unter ⚙️ einen Sicherungscode erstellen und ihn in der App dort wieder einspielen.'),
    h('div', { class: 'btn-row' },
      app.installPrompt && h('button', {
        class: 'btn btn-small btn-sun',
        onclick: async () => {
          app.installPrompt.prompt();
          await app.installPrompt.userChoice.catch(() => null);
          app.installPrompt = null;
          go('home');
        },
      }, 'Jetzt installieren'),
      h('button', {
        class: 'btn btn-small',
        onclick: () => { s.settings.installHint = false; persist(); go('home'); },
      }, 'Ausblenden')));
}

export function home(root) {
  const s = app.state;
  const t = today();
  const focus = focusRow(s);
  const open = unlockedRows(s);
  const nextLocked = ROW_ORDER.find((n) => !s.rows[n].open);
  const fresh = Object.values(s.stickers).filter((x) => x.fresh).length;

  const top = h('header', { class: 'topbar' },
    h('div', { class: 'hello' }, h('h1', {}, s.name ? `Hallo ${s.name}!` : 'Hallo!')),
    h('button', { class: 'icon-btn', 'aria-label': fresh ? `Stickeralbum, ${fresh} neu` : 'Stickeralbum', onclick: () => go('album') },
      h('span', { 'aria-hidden': 'true' }, '📒'),
      fresh > 0 && h('span', { class: 'dot-badge', 'aria-hidden': 'true' }, fresh)),
    h('button', { class: 'icon-btn', 'aria-label': 'Für Eltern', onclick: () => go('parents') },
      h('span', { 'aria-hidden': 'true' }, '⚙️'),
      backupDue(s, t) && h('span', { class: 'dot-badge', 'aria-hidden': 'true' }, '!')));

  const hero = h('section', { class: 'card hero' },
    h('p', { class: 'status' }, statusText(s, t)),
    goalBar(s, t),
    h('button', { class: 'btn btn-sun btn-wide', onclick: () => go('play', { mode: 'daily' }) }, 'Tagestraining starten'));

  const map = h('div', { class: 'map' }, ROW_ORDER.map((n, i) => island(s, n, i, t, focus, nextLocked)));

  const blitzOpen = open.length >= 3;
  const blitz = h('section', { class: 'card blitz-card' },
    h('span', { class: 'big-emoji', 'aria-hidden': 'true' }, '⏱️'),
    h('div', { class: 'txt' },
      h('h3', {}, 'Rekordjagd'),
      h('p', { class: 'soft' }, blitzOpen
        ? (s.records.blitz ? `60 Sekunden. Dein Rekord: ${s.records.blitz}` : '60 Sekunden – wie viele schaffst du?')
        : `Geht auf, sobald du 3 Inseln hast (${open.length} von 3).`)),
    blitzOpen && h('button', { class: 'btn btn-small', onclick: () => go('play', { mode: 'blitz' }) }, 'Los'));

  add(root, top, hero, weekCard(s, t),
    h('div', { class: 'map-title' }, h('h2', {}, 'Deine Inseln'), h('span', { class: 'soft' }, `${open.length} von 10 entdeckt`)),
    map, blitz, installCard(s));

  const redraw = () => drawRoute(map);
  requestAnimationFrame(redraw);
  document.fonts?.ready.then(redraw);
  window.addEventListener('resize', redraw);
  onLeave(() => window.removeEventListener('resize', redraw));
}
