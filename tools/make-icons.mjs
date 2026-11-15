// Erzeugt die App-Symbole (PNG) ohne Abhängigkeiten: Meer, Sandinsel, großes gelbes Mal-Kreuz.
// node tools/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../icons/', import.meta.url);
const SEA = [143, 211, 232];
const WAVE = [180, 227, 241];
const SAND = [246, 223, 168];
const INK = [28, 36, 82];
const SUN = [255, 200, 61];

function capsuleDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function ellipseInside(px, py, cx, cy, rx, ry) {
  return ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1;
}

// Farbe an Position (u, v) in 0..1
function colorAt(u, v) {
  let c = SEA;
  for (const wy of [0.9, 0.12]) {
    if (Math.abs(v - (wy + 0.012 * Math.sin(u * 28))) < 0.01 && u > 0.08 && u < 0.92) c = WAVE;
  }
  if (ellipseInside(u, v, 0.5, 0.78, 0.36, 0.125)) c = INK;
  if (ellipseInside(u, v, 0.5, 0.78, 0.335, 0.1)) c = SAND;
  const arms = [[0.32, 0.24, 0.68, 0.6], [0.68, 0.24, 0.32, 0.6]];
  const d = Math.min(...arms.map(([ax, ay, bx, by]) => capsuleDist(u, v, ax, ay, bx, by)));
  if (d < 0.105) c = INK;
  if (d < 0.075) c = SUN;
  return c;
}

function render(size) {
  const ss = 4;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const [cr, cg, cb] = colorAt((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size);
          r += cr; g += cg; b += cb;
        }
      }
      const n = ss * ss;
      row.set([Math.round(r / n), Math.round(g / n), Math.round(b / n), 255], 1 + x * 4);
    }
    rows.push(row);
  }
  return png(size, size, Buffer.concat(rows));
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(w, h, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(new URL(name, OUT), render(size));
  console.log(`icons/${name} (${size}×${size})`);
}
