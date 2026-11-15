// Erster Start: Name des Kindes (freiwillig).

import { h } from './dom.js';
import { app, go, persist } from './core.js';
import { isIOS, isStandalone } from './widgets.js';

export function welcome(root) {
  const input = h('input', {
    class: 'field',
    id: 'name',
    maxlength: '20',
    autocomplete: 'off',
    autocapitalize: 'words',
    enterkeyhint: 'go',
    placeholder: 'Dein Vorname',
    value: app.state.name || '',
  });
  const form = h('form', {
    onsubmit: (e) => {
      e.preventDefault();
      app.state.name = input.value.trim().slice(0, 20);
      app.state.onboarded = true;
      persist();
      go('home');
    },
  },
  h('label', { for: 'name' }, 'Wie heißt du?'),
  input,
  h('button', { class: 'btn btn-sun btn-wide', type: 'submit' }, 'Losfahren'));

  // iPhone: Die App auf dem Home-Bildschirm hat einen eigenen Speicher. Darum vor dem ersten Üben installieren.
  const iosHint = isIOS() && !isStandalone() && h('section', { class: 'card install' },
    h('h3', {}, 'Für Eltern: zuerst auf den Home-Bildschirm'),
    h('p', {}, 'In Safari unten auf „Teilen“ tippen, dann „Zum Home-Bildschirm“, und Mal-Inseln von dort öffnen. Auf dem iPhone hat die App dort einen eigenen Speicher – was hier im Browser geübt wird, wäre dort nicht dabei.'));

  root.append(h('div', { class: 'welcome' },
    h('div', { class: 'logo', 'aria-hidden': 'true' }, '🏝️'),
    h('h1', {}, 'Mal-Inseln'),
    h('p', {}, 'Segle von Insel zu Insel. Jede Insel ist eine Einmaleins-Reihe – und für jede Stufe gibt es Sticker.'),
    form,
    iosHint || ''));
}
