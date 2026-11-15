// Laden, Speichern, Migration und Sicherungscode. Ein kaputter Speicherinhalt wird beiseitegelegt, nie stillschweigend gelöscht.

import { newState, SCHEMA_VERSION } from './model.js';

export const STORAGE_KEY = 'einmaleins-v1';
export const BROKEN_KEY = 'einmaleins-v1-defekt';
const PREFIX = 'EMM1';

function memoryStorage() {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); } };
}

function defaultStorage() {
  try {
    return globalThis.localStorage ?? memoryStorage();
  } catch {
    return memoryStorage();
  }
}

function isObj(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

// Übernimmt einen gespeicherten Stand in das aktuelle Format; fehlende Teile kommen aus einem frischen Stand.
export function migrate(raw, today) {
  if (!isObj(raw) || !isObj(raw.cards) || !isObj(raw.rows)) throw new Error('Das ist kein Einmaleins-Spielstand.');
  if (typeof raw.v !== 'number' || raw.v > SCHEMA_VERSION) throw new Error('Dieser Spielstand ist von einer neueren App-Version.');
  const base = newState(today);
  const s = { ...base, ...raw, v: SCHEMA_VERSION };
  s.cards = {};
  for (const [key, card] of Object.entries(base.cards)) {
    const c = raw.cards[key];
    s.cards[key] = isObj(c) ? { ...card, ...c } : card;
  }
  s.rows = {};
  for (const [n, row] of Object.entries(base.rows)) {
    const r = raw.rows[n];
    s.rows[n] = isObj(r) ? { ...row, ...r } : row;
  }
  if (!Object.values(s.rows).some((r) => r.open)) s.rows = base.rows;
  for (const part of ['stats', 'records', 'settings']) s[part] = { ...base[part], ...(isObj(raw[part]) ? raw[part] : {}) };
  for (const part of ['stickers', 'weeks', 'days']) s[part] = isObj(raw[part]) ? raw[part] : {};
  return s;
}

export function load(storage = defaultStorage(), today) {
  let text = null;
  try {
    text = storage.getItem(STORAGE_KEY);
  } catch {
    return newState(today);
  }
  if (!text) return newState(today);
  try {
    return migrate(JSON.parse(text), today);
  } catch {
    try { storage.setItem(BROKEN_KEY, text); } catch { /* egal */ }
    return newState(today);
  }
}

export function save(state, storage = defaultStorage()) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

function checksum(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

export function encodeBackup(state) {
  const payload = toBase64Url(JSON.stringify(state));
  return `${PREFIX}-${checksum(payload)}-${payload}`;
}

// Findet den Code auch, wenn davor/danach anderer Text steht (z. B. Titel beim Teilen) oder Zeilenumbrüche darin sind.
function findCode(text) {
  const raw = String(text ?? '');
  const token = new RegExp(`${PREFIX}-([0-9a-z]+)-([A-Za-z0-9_-]+)`);
  let found = null;
  for (const candidate of [raw, raw.replace(/\s+/g, '')]) {
    const m = candidate.match(token);
    if (!m) continue;
    found = { sum: m[1], payload: m[2] };
    if (checksum(m[2]) === m[1]) return found;
  }
  return found;
}

export function decodeBackup(text, today) {
  const code = findCode(text);
  if (!code) throw new Error('Das sieht nicht wie ein Sicherungscode aus.');
  const { sum, payload } = code;
  if (checksum(payload) !== sum) throw new Error('Der Code ist unvollständig oder verändert. Bitte ganz kopieren.');
  let raw;
  try {
    raw = JSON.parse(fromBase64Url(payload));
  } catch {
    throw new Error('Der Code lässt sich nicht lesen.');
  }
  return migrate(raw, today);
}

export async function requestPersist() {
  try {
    if (!globalThis.navigator?.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
