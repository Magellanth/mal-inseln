// Stickeralbum: eine Seite je Insel, dazu Tages-, Wochen- und besondere Sticker.

import { h, add, dialog } from './dom.js';
import { app, go, persist } from './core.js';
import { stickerEl } from './widgets.js';
import { STAGE_NAMES } from '../model.js';
import { STICKERS, GROUPS, ROW_THEMES, stickersInGroup, ownedCount } from '../stickers.js';

const GROUP_NOTE = {
  day: 'Fürs Tagesziel',
  week: 'Für 4 Übungstage in einer Woche',
  special: 'Für besondere Leistungen',
};

function howToGet(sticker) {
  if (sticker.row) return `Hol dir ${STAGE_NAMES[sticker.stage]} auf der ${sticker.row}er-Insel.`;
  if (sticker.group === 'day') return 'Schaff dein Tagesziel: ein Tagestraining oder 15 Aufgaben an einem Tag.';
  if (sticker.group === 'week') return 'Schaff in einer Woche an 4 Tagen dein Tagesziel.';
  return sticker.how;
}

function showSticker(sticker, owned) {
  const content = owned
    ? [stickerEl(sticker), h('h2', {}, sticker.name), h('p', { class: 'soft' }, howToGet(sticker))]
    : [stickerEl(sticker, { owned: false }), h('h2', {}, 'Noch nicht gesammelt'), h('p', {}, howToGet(sticker))];
  dialog(content, [{ label: 'Schließen', value: true, primary: true }]);
}

function groupCard(group, state) {
  const items = stickersInGroup(group.id);
  const have = items.filter((s) => state.stickers[s.id]).length;
  const title = group.row ? ROW_THEMES[group.row].title : group.title;
  const note = group.row ? `${group.row}er-Reihe` : GROUP_NOTE[group.id];
  return h('section', { class: 'card album-group' },
    h('header', {},
      h('div', {}, h('h2', {}, title), h('p', { class: 'soft' }, note)),
      h('span', { class: 'album-total' }, `${have}/${items.length}`)),
    h('div', { class: 'album-grid' }, items.map((sticker) => {
      const owned = state.stickers[sticker.id];
      const caption = owned ? sticker.name : (sticker.stage ? STAGE_NAMES[sticker.stage] : '');
      return h('button', {
        class: 'slot',
        'aria-label': owned ? sticker.name : `Noch nicht gesammelt${caption ? `: ${caption}` : ''}`,
        onclick: () => showSticker(sticker, !!owned),
      },
      owned?.fresh && h('span', { class: 'new-flag' }, 'Neu'),
      stickerEl(sticker, { owned: !!owned }),
      h('span', {}, caption));
    })));
}

// Entdeckte Inseln zuerst, dann Tages-, Wochen- und besondere Sticker, gesperrte Inseln zum Schluss.
function orderedGroups(s) {
  const open = GROUPS.filter((g) => g.row && s.rows[g.row].open);
  const locked = GROUPS.filter((g) => g.row && !s.rows[g.row].open);
  const other = ['day', 'week', 'special'].map((id) => GROUPS.find((g) => g.id === id));
  return [...open, ...other, ...locked];
}

export function album(root) {
  const s = app.state;
  add(root,
    h('header', { class: 'sub-head' },
      h('button', { class: 'icon-btn', 'aria-label': 'Zurück zur Inselkarte', onclick: () => go('home') }, '←'),
      h('h1', {}, 'Stickeralbum'),
      h('span', { class: 'album-total' }, `${ownedCount(s)}/${STICKERS.length}`)),
    orderedGroups(s).map((g) => groupCard(g, s)));

  // „Neu“-Markierungen gelten als gesehen, sobald das Album offen war.
  let changed = false;
  for (const entry of Object.values(s.stickers)) {
    if (entry.fresh) { entry.fresh = false; changed = true; }
  }
  if (changed) persist();
}
