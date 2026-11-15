// Start der App: Stand laden, Bildschirme registrieren, Offline-Modus einschalten.

import { app, go, persist, today } from './ui/core.js';
import { load, requestPersist } from './storage.js';
import { syncStickers } from './stickers.js';
import * as sound from './sound.js';
import { welcome } from './ui/welcome.js';
import { home } from './ui/home.js';
import { play } from './ui/play.js';
import { result } from './ui/result.js';
import { album } from './ui/album.js';
import { parents } from './ui/parents.js';
import { rowView } from './ui/row.js';

app.screens = { welcome, home, play, result, album, parents, row: rowView };
app.state = load(undefined, today());
sound.setEnabled(app.state.settings.sound);
syncStickers(app.state, today());
persist();
requestPersist();

let shownDay = today();
go(app.state.onboarded ? 'home' : 'welcome');

// Über Nacht offen gelassen: Startbildschirm beim Zurückkommen neu zeichnen.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (today() !== shownDay && app.current === 'home') go('home');
  shownDay = today();
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  app.installPrompt = e;
  if (app.current === 'home') go('home');
});

// Offline-Modus. Beim lokalen Entwickeln nur mit ?sw, damit Änderungen sofort sichtbar sind.
const devHost = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && location.protocol !== 'file:' && (!devHost || new URLSearchParams(location.search).has('sw'))) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
