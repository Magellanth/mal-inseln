// App-Zustand und Bildschirmwechsel. Bildschirme registrieren sich in app.screens (siehe app.js).

import { dayNum } from '../days.js';
import { save } from '../storage.js';

export const app = {
  state: null,
  screens: {},
  current: null,
  cleanup: null,
  saveOk: true,
  installPrompt: null,
};

export function today() {
  return dayNum();
}

export function persist() {
  app.saveOk = save(app.state);
}

export function go(name, params = {}) {
  if (app.cleanup) {
    const fn = app.cleanup;
    app.cleanup = null;
    fn();
  }
  document.querySelectorAll('.overlay').forEach((el) => el.remove());
  const root = document.getElementById('app');
  root.replaceChildren();
  root.className = `screen-${name}`;
  window.scrollTo(0, 0);
  app.current = name;
  app.screens[name](root, params);
}

// Aufräumen beim Verlassen des Bildschirms (Tasten-Listener, Timer …).
export function onLeave(fn) {
  const prev = app.cleanup;
  app.cleanup = prev ? () => { prev(); fn(); } : fn;
}
