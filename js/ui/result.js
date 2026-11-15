// Ergebnis nach einer Runde: Punkte, neue Stufen und Inseln, Sticker-Tüten zum Aufreißen.

import { h } from './dom.js';
import { app, go, today } from './core.js';
import { stickerEl, medal } from './widgets.js';
import { goalBar } from './home.js';
import { dayGoalReached } from '../model.js';
import { STAGE_NAMES } from '../model.js';
import { STICKER_BY_ID, ROW_THEMES } from '../stickers.js';
import { confetti } from '../fx.js';
import * as sound from '../sound.js';

const STAGE_TEXT = {
  1: 'Jede Aufgabe einmal geschafft.',
  2: 'Das sitzt schon sicher.',
  3: 'Profi! Das hält auch nach Tagen.',
  4: 'Meister! Das sitzt bombenfest.',
};

const PACK_LABEL = { day: 'Tages-Sticker', week: 'Wochen-Sticker', special: 'Besonderer Sticker' };

function uniqueStageUps(list) {
  const seen = new Set();
  return list.filter((u) => {
    const key = `${u.row}-${u.stage}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pack(id) {
  const sticker = STICKER_BY_ID[id];
  const label = sticker.group.startsWith('row-') ? 'Insel-Sticker' : PACK_LABEL[sticker.group];
  const el = h('button', { class: 'pack', 'aria-label': `${label} öffnen` },
    h('span', {}, label, h('br'), h('span', { class: 'tap' }, 'Tippen!')));
  el.addEventListener('click', () => {
    if (el.classList.contains('opened')) return;
    el.classList.add('opened');
    el.setAttribute('aria-label', `${sticker.name} bekommen`);
    el.replaceChildren(stickerEl(sticker), h('span', { class: 'pack-name' }, sticker.name));
    sound.play('sticker');
  });
  return el;
}

export function result(root, p) {
  const stageUps = uniqueStageUps(p.stageUps ?? []);
  const unlocked = [...new Set(p.unlocked ?? [])];
  const stickers = p.stickers ?? [];

  let head;
  if (p.mode === 'blitz') {
    let note;
    if (p.isRecord && p.prevRecord > 0) note = `Neuer Rekord! Vorher: ${p.prevRecord}`;
    else if (p.isRecord) note = 'Dein erster Rekord!';
    else note = `Dein Rekord: ${p.prevRecord}`;
    head = h('section', { class: 'card result-head' },
      h('h1', {}, 'Zeit um!'),
      h('p', { class: 'score' }, `${p.score} richtig`),
      h('p', {}, note));
  } else {
    head = h('section', { class: 'card result-head' },
      h('h1', {}, p.discoverRow ? `Die ${p.discoverRow}er-Insel ist entdeckt!` : 'Runde geschafft!'),
      h('p', { class: 'score' }, `${p.right} von ${p.total}`),
      h('p', {}, p.perfect ? 'Alles richtig – stark!' : 'Aufgaben richtig. Was noch wackelt, kommt wieder dran.'));
  }

  const t = today();
  const goalDone = dayGoalReached(app.state, t);
  const news = [
    p.goalReached && h('div', { class: 'card news-item' },
      h('span', { class: 'big', 'aria-hidden': 'true' }, '✅'),
      h('div', {}, h('h3', {}, 'Tagesziel geschafft!'), h('p', { class: 'soft' }, 'Dafür gibt es heute einen Stempel auf deiner Wochenkarte.'))),
    ...stageUps.map((u) => h('div', { class: 'card news-item' },
      medal(u.stage),
      h('div', {}, h('h3', {}, `${u.row}er-Insel: ${STAGE_NAMES[u.stage]}!`), h('p', { class: 'soft' }, STAGE_TEXT[u.stage])))),
    ...unlocked.map((n) => h('div', { class: 'card news-item' },
      h('span', { class: 'big', 'aria-hidden': 'true' }, ROW_THEMES[n].icon),
      h('div', {}, h('h3', {}, `Neue Insel: ${ROW_THEMES[n].title}`), h('p', { class: 'soft' }, `Die ${n}er-Reihe wartet auf dich.`)))),
  ];

  // Solange das Tagesziel fehlt, ist „Noch eine Runde“ der Hauptknopf.
  const againLabel = p.mode === 'blitz' ? 'Nochmal jagen' : 'Noch eine Runde';
  const againParams = p.mode === 'blitz' ? { mode: 'blitz' } : { mode: p.mode, row: p.row };
  const again = h('button', { class: `btn btn-wide ${goalDone ? '' : 'btn-sun'}`, onclick: () => go('play', againParams) }, againLabel);
  const toMap = h('button', { class: `btn btn-wide ${goalDone ? 'btn-sun' : ''}`, onclick: () => go('home') }, 'Zur Inselkarte');
  const visibleNews = news.filter(Boolean);

  root.append(h('div', { class: 'result' },
    head,
    !goalDone && h('section', { class: 'card', style: { padding: '14px 16px' } }, goalBar(app.state, t)),
    visibleNews.length > 0 && h('div', { class: 'news' }, visibleNews),
    stickers.length > 0 && h('section', {},
      h('h2', { style: { textAlign: 'center', marginBottom: '12px' } }, stickers.length === 1 ? 'Ein neuer Sticker!' : `${stickers.length} neue Sticker!`),
      h('div', { class: 'packs' }, stickers.map(pack))),
    goalDone ? [toMap, again] : [again, toMap]));

  if (stageUps.length || unlocked.length || p.isRecord || p.goalReached) {
    sound.play('stage');
    confetti();
  } else {
    sound.play('finish');
  }
}
