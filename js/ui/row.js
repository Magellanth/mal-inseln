// Reihen-Übersicht: die ganze Reihe zum Durchlesen und Mitsprechen, mit „Abdecken“ zum Selbsttest.

import { h, add } from './dom.js';
import { app, go } from './core.js';
import { medals } from './widgets.js';
import { STAGE_NAMES, cardKey, isDiscovered } from '../model.js';
import { ROW_THEMES } from '../stickers.js';

const CORE = [1, 2, 5, 10];
const BOX_TEXT = ['neu', 'gerade gelernt', 'sicher', 'hält über Tage', 'hält über Tage', 'sitzt fest'];

export function rowView(root, { row: n }) {
  const s = app.state;
  const theme = ROW_THEMES[n];
  let covered = false;

  const results = [];
  const lines = [];
  for (let k = 1; k <= 10; k++) {
    const box = s.cards[cardKey(k, n)].box;
    const res = h('button', {
      class: 'res',
      type: 'button',
      disabled: true,
      onclick: () => reveal(res, k),
    }, k * n);
    results.push(res);
    lines.push(h('li', { class: CORE.includes(k) ? 'core' : '' },
      h('i', { class: `status-dot b${box}`, title: BOX_TEXT[box], 'aria-label': BOX_TEXT[box] }),
      h('span', { class: 'eq' }, `${k} · ${n} =`),
      res));
  }

  function reveal(el, k) {
    if (!covered) return;
    el.textContent = String(k * n);
    el.classList.remove('hidden');
    el.disabled = true;
    el.setAttribute('aria-label', String(k * n));
  }

  const stones = h('div', { class: 'stones count-row', 'aria-label': `Zählreihe: ${Array.from({ length: 10 }, (_, i) => (i + 1) * n).join(', ')}` },
    Array.from({ length: 10 }, (_, i) => h('span', { class: 'stone', 'aria-hidden': 'true' }, (i + 1) * n)));

  const coverBtn = h('button', { class: 'btn btn-small', 'aria-pressed': 'false', onclick: toggleCover }, 'Ergebnisse abdecken');

  function toggleCover() {
    covered = !covered;
    coverBtn.textContent = covered ? 'Alles aufdecken' : 'Ergebnisse abdecken';
    coverBtn.setAttribute('aria-pressed', String(covered));
    stones.hidden = covered;
    hintText.textContent = covered
      ? 'Sag das Ergebnis leise vor dich hin und tipp dann aufs Fragezeichen.'
      : 'Lies die Reihe laut. Die gelben Aufgaben sind Kernaufgaben – aus ihnen kannst du die anderen ableiten.';
    results.forEach((el, i) => {
      const k = i + 1;
      el.disabled = !covered;
      el.classList.toggle('hidden', covered);
      el.textContent = covered ? '?' : String(k * n);
      if (covered) el.setAttribute('aria-label', `Ergebnis von ${k} mal ${n} aufdecken`);
      else el.removeAttribute('aria-label');
    });
  }

  const hintText = h('p', { class: 'soft' }, 'Lies die Reihe laut. Die gelben Aufgaben sind Kernaufgaben – aus ihnen kannst du die anderen ableiten.');

  add(root,
    h('header', { class: 'sub-head' },
      h('button', { class: 'icon-btn', 'aria-label': 'Zurück zur Inselkarte', onclick: () => go('home') }, '←'),
      h('div', { class: 'row-title' },
        h('h1', {}, `${n}er-Reihe`),
        h('p', { class: 'soft' }, s.rows[n].stage ? `${theme.title}: ${STAGE_NAMES[s.rows[n].stage]}` : theme.title)),
      medals(s.rows[n].stage)),
    h('section', { class: 'card row-sheet', style: { '--world': theme.color } },
      h('div', { class: 'row-sheet-head' }, h('h2', {}, 'Zum Mitsprechen'), coverBtn),
      stones,
      h('ol', { class: 'times' }, lines),
      hintText,
      h('p', { class: 'legend' },
        h('span', {}, h('i', { class: 'status-dot b0' }), 'neu'),
        h('span', {}, h('i', { class: 'status-dot b1' }), 'gerade gelernt'),
        h('span', {}, h('i', { class: 'status-dot b2' }), 'sicher'),
        h('span', {}, h('i', { class: 'status-dot b5' }), 'sitzt fest'))),
    h('button', { class: 'btn btn-sun btn-wide row-go', onclick: () => go('play', { mode: 'row', row: n }) },
      isDiscovered(s, n) ? `${n}er-Reihe üben` : `${n}er-Reihe entdecken`));
}
