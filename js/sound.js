// Kurze, freundliche Klänge – im Browser erzeugt, keine Dateien.

let ctx = null;
let enabled = true;

export function setEnabled(value) {
  enabled = value;
}

function audio() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(c, freq, start, dur, { type = 'triangle', gain = 0.16 } = {}) {
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(amp).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

const SONGS = {
  right: [[784, 0, 0.12], [1175, 0.08, 0.2]],
  fixed: [[659, 0, 0.15]],
  wrong: [[330, 0, 0.18, 'sine', 0.12], [262, 0.12, 0.25, 'sine', 0.1]],
  stage: [[523, 0, 0.14], [659, 0.1, 0.14], [784, 0.2, 0.14], [1047, 0.3, 0.35]],
  sticker: [[1319, 0, 0.1, 'sine', 0.1], [1568, 0.07, 0.1, 'sine', 0.1], [2093, 0.14, 0.25, 'sine', 0.1]],
  finish: [[392, 0, 0.14], [523, 0.12, 0.14], [659, 0.24, 0.3]],
};

export function play(name) {
  if (!enabled) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  for (const [freq, at, dur, type, gain] of SONGS[name] ?? []) tone(c, freq, t + at, dur, { type, gain });
}
