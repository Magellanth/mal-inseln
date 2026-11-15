// Wiederverwendbare Bausteine: Sticker, Medaillen, Zahlenfeld, Punktefeld, Trittsteine.

import { h } from './dom.js';

const emojiCache = new Map();

// Prüft per Canvas, ob das Gerät ein Emoji farbig darstellen kann (sonst Ersatzmotiv).
export function emojiOk(ch) {
  if (emojiCache.has(ch)) return emojiCache.get(ch);
  let ok = true;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    g.font = '26px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    g.fillText(ch, 16, 17);
    const px = g.getImageData(0, 0, 32, 32).data;
    ok = false;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] > 100 && (Math.abs(px[i] - px[i + 1]) > 30 || Math.abs(px[i + 1] - px[i + 2]) > 30)) { ok = true; break; }
    }
  } catch {
    ok = true;
  }
  emojiCache.set(ch, ok);
  return ok;
}

function tilt(id) {
  let x = 0;
  for (const c of id) x = (x * 31 + c.charCodeAt(0)) % 997;
  return `${(x % 13) - 6}deg`;
}

export function stickerEl(sticker, { owned = true } = {}) {
  if (!owned) return h('div', { class: 'sticker missing', 'aria-hidden': 'true' }, '?');
  const ok = emojiOk(sticker.emoji);
  return h('div', {
    class: `sticker ${sticker.holo ? 'holo' : ''}`,
    style: { '--tilt': tilt(sticker.id), '--tint': sticker.tint ?? '#ffffff' },
    role: 'img',
    'aria-label': sticker.name,
  },
  h('span', { class: 'emoji' }, ok ? sticker.emoji : sticker.fallback),
  !ok && h('span', { class: 'fallback-name' }, sticker.name));
}

export function medals(stage) {
  return h('span', { class: 'medals', 'aria-label': `Stufe ${stage} von 4` },
    [1, 2, 3, 4].map((s) => h('i', { class: `medal s${s} ${stage >= s ? 'on' : ''}` })));
}

export function medal(stage) {
  return h('i', { class: `medal s${stage} on`, 'aria-hidden': 'true' });
}

// Großes Zahlenfeld. onKey bekommt '0'–'9', 'del' oder 'ok'.
export function numpad(onKey) {
  const key = (label, value, cls = '', aria = null) => h('button', {
    class: `key ${cls}`,
    type: 'button',
    'aria-label': aria ?? label,
    onclick: () => onKey(value),
  }, label);
  return h('div', { class: 'pad' },
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => key(d, d)),
    key('⌫', 'del', 'del', 'Löschen'),
    key('0', '0'),
    key('OK', 'ok', 'ok', 'Fertig'));
}

// Physische Tastatur (Tablet/PC) aufs Zahlenfeld legen. Gibt eine Aufräumfunktion zurück.
export function bindKeyboard(onKey) {
  const handler = (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (document.querySelector('.overlay')) return;
    if (/^[0-9]$/.test(e.key)) onKey(e.key);
    else if (e.key === 'Backspace') onKey('del');
    else if (e.key === 'Enter') { e.preventDefault(); onKey('ok'); }
    else return;
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}

// Punktefeld passend zum Rechenweg (siehe hintFor): farbige Kern-Reihen, graue Rest-Reihen, hohle abgezogene Reihen.
// Nach 5 Reihen ein Abstand zum leichteren Zählen.
export function dotsEl({ rows, cols, accentRows, ghostRows }) {
  const total = rows + ghostRows;
  const size = cols >= 8 || total > 8 ? 9 : cols >= 5 ? 11 : 13;
  const lines = [];
  for (let r = 0; r < total; r++) {
    const kind = r < accentRows ? '' : r < rows ? 'rest' : 'ghost';
    lines.push(h('div', { class: `dot-row ${r === 5 ? 'split' : ''}` }, Array.from({ length: cols }, () => h('b', { class: kind }))));
  }
  return h('div', { class: 'dots', style: { '--d': `${size}px` }, 'aria-label': `${rows} Reihen mit je ${cols} Punkten` }, lines);
}

// Hüpf-Hilfe: Trittsteine der Reihe bis zur gesuchten Zahl.
export function stonesEl(k, n) {
  const stones = [];
  for (let i = 0; i < k; i++) stones.push(h('span', { class: 'stone' }, i * n));
  stones.push(h('span', { class: 'stone goal' }, '?'));
  const text = k === 1 ? `Ein ${n}er-Sprung` : `Spring weiter: immer + ${n}`;
  return h('div', { class: 'hops' }, h('p', {}, text), h('div', { class: 'stones' }, stones));
}

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
