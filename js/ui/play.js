// Aufgaben-Bildschirm: Tagestraining, Reihe üben (inkl. Entdecker-Runde) und Rekordjagd.

import { h, fill, ask, toast } from './dom.js';
import { app, go, today, persist, onLeave } from './core.js';
import { numpad, bindKeyboard, dotsEl, stonesEl } from './widgets.js';
import { applyAnswer, parseKey, markDiscovered, recordRound, recordQuiz } from '../model.js';
import { buildDailyRound, buildRowRound, pickBlitzTask, easyPool, Round, MAX_REPEATS } from '../rounds.js';
import { hintFor } from '../hints.js';
import { quizExplain } from '../quiz.js';
import { ROW_THEMES, syncStickers } from '../stickers.js';
import * as sound from '../sound.js';

const BLITZ_MS = 60000;
const MAX_DIGITS = 3;

function equation(a, b, answerEl) {
  return h('div', { class: 'equation', 'aria-label': `${a} mal ${b}` },
    h('span', {}, a), h('span', { class: 'op' }, '·'), h('span', {}, b), h('span', { class: 'op' }, '='), answerEl);
}

function typeInto(input, key) {
  if (key === 'del') return input.slice(0, -1);
  if (input.length >= MAX_DIGITS) return input;
  if (input === '0') return key;
  return input + key;
}

function choiceLabel(q, value) {
  return q.type === 'whichRow' ? `${value}er` : String(value);
}

function quizQuestion(q) {
  if (q.type === 'whichRow') return [`In welche Reihe gehört die ${q.number}?`];
  if (q.type === 'notMember') return ['Welche Zahl gehört ', h('strong', { class: 'not' }, 'nicht'), ` in die ${q.row}er-Reihe?`];
  return [`Welche Zahl gehört in die ${q.row}er-Reihe?`];
}

// Zählreihe n, 2n … 10n in zwei Fünferreihen; die gesuchten Zahlen sind markiert.
function countRowEl(n, mark) {
  return h('div', { class: 'stones quiz-count', 'aria-label': `${n}er-Reihe: ${Array.from({ length: 10 }, (_, i) => (i + 1) * n).join(', ')}` },
    Array.from({ length: 10 }, (_, i) => {
      const x = (i + 1) * n;
      return h('span', { class: `stone ${mark.includes(x) ? 'goal' : ''}`, 'aria-hidden': 'true' }, x);
    }));
}

function leaveWithStickers() {
  const got = syncStickers(app.state, today());
  persist();
  go('home');
  if (got.length) toast(got.length === 1 ? 'Ein neuer Sticker wartet im Album!' : `${got.length} neue Sticker warten im Album!`);
}

export function play(root, params) {
  if (params.mode === 'blitz') return blitz(root);
  const s = app.state;
  const { mode, row } = params;
  const plan = mode === 'daily' ? buildDailyRound(s, today()) : buildRowRound(s, row);
  const round = new Round(plan.tasks, { easyPool: easyPool(s) });
  const summary = { mode, row, discoverRow: plan.discoverRow, stageUps: [], unlocked: [], goalReached: false, cards: 0, fast: 0 };
  const worldRow = plan.discoverRow ?? (mode === 'row' ? row : null);

  let label;
  if (plan.discoverRow) label = `Entdecke die ${plan.discoverRow}er-Reihe`;
  else if (mode === 'row') label = `${ROW_THEMES[row].title}: ${row}er-Reihe`;
  else label = 'Tagestraining';

  const bar = h('i');
  const count = h('span', { class: 'count' });
  const live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
  const taskBox = h('section', { class: 'task card' });
  const closeBtn = h('button', { class: 'icon-btn', 'aria-label': 'Runde beenden', onclick: quit }, '✕');
  const wrap = h('div', { class: 'play' },
    h('div', { class: 'play-head' }, closeBtn, h('div', { class: 'progress', 'aria-hidden': 'true' }, bar), count),
    taskBox,
    numpad(onKey),
    live);
  if (worldRow !== null && worldRow !== undefined) wrap.style.setProperty('--world', ROW_THEMES[worldRow].color);
  root.append(wrap);
  onLeave(bindKeyboard(onKey));
  let left = false; // Bildschirm verlassen: ausstehende Timer dürfen nichts mehr tun
  onLeave(() => { left = true; });
  // War die App im Hintergrund, startet die Zeit für „blitzschnell“ neu.
  const onVisible = () => { if (!document.hidden && !busy) shownAt = performance.now(); };
  document.addEventListener('visibilitychange', onVisible);
  onLeave(() => document.removeEventListener('visibilitychange', onVisible));

  let input = '';
  let phase = 'ask'; // ask → (fix) → nächste; Quizfrage: quiz → (quizfix) → nächste
  let busy = false;
  let shownAt = 0;
  let firstMs = 0;
  let answerEl = null;
  let choiceEls = [];

  function showTask() {
    const t = round.current;
    bar.style.width = `${(round.done / round.total) * 100}%`;
    count.textContent = `${round.done + 1}/${round.total}`;
    wrap.classList.toggle('quiz-mode', !!t.quiz);
    if (t.quiz) return showQuiz(t.quiz);
    const { k, n } = parseKey(t.key);
    const [a, b] = t.swapped ? [n, k] : [k, n];
    answerEl = h('span', { class: 'answer empty' });
    taskBox.className = 'task card';
    fill(taskBox,
      h('p', { class: 'label' }, t.easy ? 'Die kennst du schon!' : label),
      equation(a, b, answerEl),
      t.hop && stonesEl(k, n));
    input = '';
    phase = 'ask';
    busy = false;
    shownAt = performance.now();
  }

  function showHint(t, k, n, given) {
    const [a, b] = t.swapped ? [n, k] : [k, n];
    const hint = hintFor(k, n);
    const close = Math.abs(given - k * n) <= Math.max(2, n);
    answerEl = h('span', { class: 'answer empty' });
    taskBox.className = 'task';
    fill(taskBox, h('div', { class: 'card hint' },
      h('div', { class: 'hint-top' },
        h('p', { class: 'hint-kicker' }, close ? 'Fast! Schau mal:' : 'Schau mal:'),
        h('p', { class: 'hint-solution' }, `${a} · ${b} = ${k * n}`)),
      h('p', { class: 'tip' }, hint.tip),
      t.swapped && h('p', { class: 'tip' }, `${a} · ${b} ist dasselbe wie ${k} · ${n}.`),
      h('div', { class: 'hint-body' },
        dotsEl(hint.dots),
        hint.lines.length > 1 && h('div', { class: 'hint-lines' }, hint.lines.map((line) => h('p', { class: 'calc' }, line)))),
      h('div', { class: 'hint-ask' }, h('span', {}, `Tipp die ${k * n} ein:`), answerEl)));
    live.textContent = `Die Lösung ist ${k * n}. Tipp sie ein.`;
    input = '';
    phase = 'fix';
    busy = false;
  }

  function showQuiz(q) {
    choiceEls = q.choices.map((value, i) => h('button', {
      class: 'choice',
      type: 'button',
      'aria-label': q.type === 'whichRow' ? `${value}er-Reihe` : String(value),
      onclick: () => choose(i),
    }, choiceLabel(q, value)));
    taskBox.className = 'task card quiz';
    fill(taskBox,
      h('p', { class: 'quiz-kicker' }, 'Quizfrage'),
      h('h2', { class: 'quiz-question' }, quizQuestion(q)),
      h('div', { class: 'choices' }, choiceEls));
    phase = 'quiz';
    busy = false;
    shownAt = performance.now();
  }

  function choose(i) {
    if (busy) return;
    const q = round.current.quiz;
    const btn = choiceEls[i];
    if (phase === 'quizfix') {
      if (i !== q.answer) return;
      busy = true;
      btn.classList.remove('tap-me');
      sound.play('fixed');
      setTimeout(() => { if (left) return; round.submit(false, firstMs); next(); }, 450);
      return;
    }
    const ms = performance.now() - shownAt;
    const correct = i === q.answer;
    const res = recordQuiz(s, { correct, today: today() });
    summary.goalReached ||= res.goalReached;
    persist();
    busy = true;
    if (correct) {
      btn.classList.add('right');
      live.textContent = 'Richtig!';
      sound.play('right');
      setTimeout(() => { if (left) return; round.submit(true, ms); next(); }, 650);
    } else {
      firstMs = ms;
      btn.classList.add('wrong');
      sound.play('wrong');
      setTimeout(() => { if (!left) showQuizHelp(q, i); }, 420);
    }
  }

  function showQuizHelp(q, picked) {
    choiceEls.forEach((el, i) => {
      if (i === q.answer) el.classList.add('right', 'tap-me');
      else el.disabled = true;
      if (i !== picked) el.classList.remove('wrong');
    });
    taskBox.append(h('div', { class: 'quiz-help' },
      h('p', { class: 'hint-kicker' }, 'Schau mal:'),
      h('p', { class: 'quiz-explain' }, quizExplain(q)),
      countRowEl(q.row, q.mark),
      h('p', { class: 'quiz-tap' }, 'Tipp die richtige Antwort an.')));
    const explain = quizExplain(q).replace(/\.?$/, '.');
    live.textContent = `Richtig ist ${choiceEls[q.answer].getAttribute('aria-label')}. ${explain} Tipp die richtige Antwort an.`;
    phase = 'quizfix';
    busy = false;
  }

  function render() {
    answerEl.textContent = input;
    answerEl.classList.toggle('empty', input === '');
  }

  function onKey(key) {
    if (busy) return;
    if (phase === 'quiz' || phase === 'quizfix') {
      if (/^[123]$/.test(key)) choose(Number(key) - 1);
      return;
    }
    if (key === 'ok') return submit();
    input = typeInto(input, key);
    render();
  }

  function submit() {
    if (input === '') return;
    const t = round.current;
    const { k, n } = parseKey(t.key);
    const value = Number(input);

    if (phase === 'fix') {
      if (value === k * n) {
        busy = true;
        answerEl.classList.add('right');
        sound.play('fixed');
        setTimeout(() => { if (left) return; round.submit(false, firstMs); next(); }, 500);
      } else {
        answerEl.classList.remove('wrong');
        void answerEl.offsetWidth;
        answerEl.classList.add('wrong');
        input = '';
        setTimeout(render, 300);
      }
      return;
    }

    const ms = performance.now() - shownAt;
    const correct = value === k * n;
    const res = applyAnswer(s, t.key, { correct, ms, today: today(), repeat: !!t.repeat });
    summary.stageUps.push(...res.stageUps);
    summary.unlocked.push(...res.unlocked);
    summary.goalReached ||= res.goalReached;
    summary.cards += 1;
    if (res.fast) summary.fast += 1;
    persist();
    busy = true;
    if (correct) {
      answerEl.classList.add('right');
      sound.play('right');
      let delay = 550;
      if (res.fast) {
        taskBox.append(h('p', { class: 'feedback fast', 'aria-hidden': 'true' }, '⚡ Blitzschnell!'));
        live.textContent = 'Richtig! Blitzschnell.';
        delay = 750;
      } else if (res.slow) {
        const comesAgain = (round.repeats[t.key] ?? 0) < MAX_REPEATS;
        const text = comesAgain
          ? 'Richtig! Die kommt gleich nochmal – schaffst du sie blitzschnell?'
          : 'Richtig! Nächstes Mal schaffst du sie blitzschnell.';
        taskBox.append(h('p', { class: 'feedback slow', 'aria-hidden': 'true' }, text));
        live.textContent = text;
        delay = 1800;
      } else {
        live.textContent = 'Richtig!';
      }
      setTimeout(() => { if (left) return; round.submit(true, ms, { again: res.slow }); next(); }, delay);
    } else {
      firstMs = ms;
      answerEl.classList.add('wrong');
      sound.play('wrong');
      setTimeout(() => { if (!left) showHint(t, k, n, value); }, 380);
    }
  }

  function next() {
    if (round.finished) finish();
    else showTask();
  }

  function finish() {
    const t = today();
    if (plan.discoverRow) markDiscovered(s, plan.discoverRow);
    const perfect = round.wrongCount === 0;
    recordRound(s, { mode, perfect, today: t });
    const stickers = syncStickers(s, t, Math.random, { perfectRound: perfect });
    persist();
    go('result', {
      ...summary,
      right: round.results.filter((r) => r.correct).length,
      total: round.results.length,
      perfect,
      stickers,
    });
  }

  async function quit() {
    if (busy) return; // gerade läuft die Rückmeldung zur letzten Antwort
    if (round.done === 0 && phase === 'ask') return go('home');
    const yes = await ask({ title: 'Runde beenden?', text: 'Was du schon gerechnet hast, ist gespeichert.', ok: 'Beenden', cancel: 'Weiter üben' });
    if (yes) leaveWithStickers();
  }

  showTask();
}

function blitz(root) {
  const s = app.state;
  const prevRecord = s.records.blitz;
  const summary = { stageUps: [], unlocked: [], goalReached: false };
  let score = 0;
  let elapsed = 0;
  let last = 0;
  let running = false;
  let lastKey = null;
  let current = null;
  let shownAt = 0;
  let input = '';
  let busy = false;
  let answerEl = null;

  const bar = h('i');
  const scoreEl = h('span', { class: 'blitz-score', 'aria-live': 'polite' }, '0');
  const taskBox = h('section', { class: 'task card' });
  const wrap = h('div', { class: 'play', style: { '--world': 'var(--orange)' } },
    h('div', { class: 'play-head' },
      h('button', { class: 'icon-btn', 'aria-label': 'Rekordjagd beenden', onclick: quit }, '✕'),
      h('div', { class: 'timer', 'aria-hidden': 'true' }, bar),
      scoreEl),
    taskBox,
    numpad(onKey));
  root.append(wrap);
  onLeave(bindKeyboard(onKey));

  fill(taskBox,
    h('h2', {}, 'Rekordjagd'),
    h('p', { class: 'label' }, prevRecord
      ? `60 Sekunden, so viele Aufgaben wie möglich. Dein Rekord: ${prevRecord}.`
      : '60 Sekunden, so viele Aufgaben wie möglich. Stell deinen ersten Rekord auf!'),
    h('button', { class: 'btn btn-sun', onclick: start }, 'Start'));

  function start() {
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
    nextTask();
  }

  function tick(now) {
    if (!running) return;
    if (!document.hidden) elapsed += now - last;
    last = now;
    bar.style.transform = `scaleX(${Math.max(0, 1 - elapsed / BLITZ_MS)})`;
    if (elapsed >= BLITZ_MS) return end();
    requestAnimationFrame(tick);
  }

  const onVisible = () => { last = performance.now(); shownAt = performance.now(); };
  document.addEventListener('visibilitychange', onVisible);
  onLeave(() => { running = false; document.removeEventListener('visibilitychange', onVisible); });

  function nextTask() {
    current = pickBlitzTask(s, Math.random, lastKey);
    lastKey = current.key;
    const { k, n } = parseKey(current.key);
    const [a, b] = current.swapped ? [n, k] : [k, n];
    answerEl = h('span', { class: 'answer empty' });
    fill(taskBox, equation(a, b, answerEl));
    input = '';
    busy = false;
    shownAt = performance.now();
  }

  function onKey(key) {
    if (!running || busy) return;
    if (key === 'ok') return submit();
    input = typeInto(input, key);
    answerEl.textContent = input;
    answerEl.classList.toggle('empty', input === '');
  }

  function submit() {
    if (input === '') return;
    const { k, n } = parseKey(current.key);
    const correct = Number(input) === k * n;
    const res = applyAnswer(s, current.key, { correct, ms: performance.now() - shownAt, today: today() });
    summary.stageUps.push(...res.stageUps);
    summary.unlocked.push(...res.unlocked);
    summary.goalReached ||= res.goalReached;
    persist();
    busy = true;
    if (correct) {
      score += 1;
      scoreEl.textContent = String(score);
      answerEl.classList.add('right');
      sound.play('right');
      setTimeout(() => running && nextTask(), 220);
    } else {
      answerEl.textContent = String(k * n);
      answerEl.classList.add('wrong');
      answerEl.style.color = 'var(--orange)';
      sound.play('wrong');
      setTimeout(() => running && nextTask(), 1100);
    }
  }

  function end() {
    running = false;
    const t = today();
    recordRound(s, { mode: 'blitz', perfect: false, today: t });
    const isRecord = score > prevRecord;
    if (isRecord) s.records.blitz = score;
    const stickers = syncStickers(s, t, Math.random, { blitzRecord: isRecord && prevRecord > 0 });
    persist();
    sound.play('finish');
    go('result', { mode: 'blitz', score, prevRecord, isRecord, stickers, ...summary });
  }

  async function quit() {
    if (!running) return go('home');
    running = false;
    const yes = await ask({ title: 'Rekordjagd abbrechen?', text: 'Diese Runde zählt dann nicht für den Rekord.', ok: 'Abbrechen', cancel: 'Weiterspielen' });
    if (yes) return leaveWithStickers();
    running = true;
    last = performance.now();
    if (busy) nextTask(); // die Rückmeldung lief während des Dialogs ab
    requestAnimationFrame(tick);
  }
}
