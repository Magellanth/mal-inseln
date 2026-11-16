import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

// Das native replaceChildren(a, b && c) schreibt ein false als Text „false“ in die Seite.
// Inhalte darum immer über fill()/add() aus dom.js setzen, die false/null überspringen.
test('kein natives replaceChildren mit Inhalt außerhalb von dom.js', () => {
  const dir = new URL('../js/ui/', import.meta.url);
  const hits = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'dom.js')) {
    const text = readFileSync(new URL(file, dir), 'utf8');
    for (const m of text.matchAll(/\.replaceChildren\(\s*[^)\s]/g)) {
      hits.push(`${file}:${text.slice(0, m.index).split('\n').length}`);
    }
  }
  assert.deepEqual(hits, []);
});
