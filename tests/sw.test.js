import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);

function listFiles(dir, base = '') {
  return readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listFiles(`${dir}${e.name}/`, `${base}${e.name}/`) : [`${base}${e.name}`]);
}

test('Service Worker cacht genau alle App-Dateien', () => {
  const sw = readFileSync(new URL('sw.js', root), 'utf8');
  const listed = [...sw.match(/const ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const expected = [
    './', 'index.html', 'manifest.webmanifest',
    ...listFiles('css/').map((f) => `css/${f}`),
    ...listFiles('icons/').map((f) => `icons/${f}`),
    ...listFiles('js/').map((f) => `js/${f}`),
  ];
  assert.deepEqual([...listed].sort(), [...expected].sort());
});

test('App-Version und Service-Worker-Version stimmen überein', async () => {
  const { APP_VERSION } = await import('../js/ui/core.js');
  const sw = readFileSync(new URL('sw.js', root), 'utf8');
  assert.ok(Number.isInteger(APP_VERSION) && APP_VERSION >= 7);
  assert.equal(sw.match(/const VERSION = '([^']+)'/)[1], `mal-inseln-v${APP_VERSION}`);
});

test('Version wird als 1.x angezeigt', async () => {
  const { versionLabel, APP_VERSION } = await import('../js/ui/core.js');
  assert.equal(versionLabel(7), '1.7');
  assert.equal(versionLabel(12), '1.12');
  assert.equal(versionLabel(), `1.${APP_VERSION}`);
});
