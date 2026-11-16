// Eltern-Bereich hinter einer Rechenaufgabe: Lernstand, Problemaufgaben, Freischalten, Sicherungscode, Einstellungen.

import { h, add, fill, ask, toast } from './dom.js';
import { app, go, today, persist } from './core.js';
import {
  ROW_ORDER, STAGE_NAMES, rowKeys, parseKey, manualUnlock, goalDays, newState, DAY_GOAL_OPTIONS, dayGoalTarget,
  SPEED_OPTIONS, speedLimit, tempoRecheck,
} from '../model.js';
import { ROW_THEMES, syncStickers } from '../stickers.js';
import { encodeBackup, decodeBackup } from '../storage.js';
import * as sound from '../sound.js';

const BACKUP_EVERY_DAYS = 14;

export function backupDue(s, t) {
  if (s.stats.tasks === 0) return false;
  const since = s.backupDay ?? s.created;
  return t - since >= BACKUP_EVERY_DAYS;
}

function dateText(day) {
  return new Date(day * 86400000).toLocaleDateString('de-DE', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
}

function gate(root) {
  const a = 12 + Math.floor(Math.random() * 8);
  const b = 3 + Math.floor(Math.random() * 7);
  const input = h('input', { class: 'field', inputmode: 'numeric', autocomplete: 'off', 'aria-label': 'Ergebnis' });
  add(root, 
    h('header', { class: 'sub-head' },
      h('button', { class: 'icon-btn', 'aria-label': 'Zurück', onclick: () => go('home') }, '←'),
      h('h1', {}, 'Für Eltern')),
    h('form', {
      class: 'card parents',
      onsubmit: (e) => {
        e.preventDefault();
        if (Number(input.value) === a * b) go('parents', { open: true });
        else { toast('Das stimmt leider nicht.'); go('parents'); }
      },
    },
    h('p', {}, 'Dieser Bereich ist für Erwachsene. Bitte rechnen:'),
    h('h2', { style: { fontSize: '40px' } }, `${a} · ${b} = ?`),
    input,
    h('button', { class: 'btn btn-sun', type: 'submit' }, 'Öffnen')));
  input.focus();
}

function overview(s) {
  const tasks = s.stats.tasks;
  const pct = tasks ? Math.round((s.stats.right / tasks) * 100) : 0;
  return h('section', { class: 'card' },
    h('h2', {}, 'Überblick'),
    h('div', { class: 'facts' },
      h('div', {}, h('b', {}, goalDays(s)), h('span', {}, 'Übungstage')),
      h('div', {}, h('b', {}, tasks), h('span', {}, 'Aufgaben')),
      h('div', {}, h('b', {}, `${pct} %`), h('span', {}, 'richtig'))));
}

function islands(s) {
  const lines = ROW_ORDER.map((n) => {
    const row = s.rows[n];
    const boxes = h('div', { class: 'boxes', 'aria-hidden': 'true' }, rowKeys(n).map((key) => h('i', { class: `b${s.cards[key].box}` })));
    const right = row.open
      ? h('span', {}, STAGE_NAMES[row.stage])
      : h('button', {
        class: 'btn btn-small',
        onclick: async () => {
          const yes = await ask({
            title: `${n}er-Reihe freischalten?`,
            text: 'Sinnvoll, wenn die Schule gerade diese Reihe übt. Sie kommt dann im Tagestraining als Nächstes dran.',
            ok: 'Freischalten',
          });
          if (!yes) return;
          manualUnlock(s, n);
          syncStickers(s, today());
          persist();
          go('parents', { open: true });
          toast(`${n}er-Reihe ist frei.`);
        },
      }, 'Freischalten');
    return h('div', { class: 'row-line', 'aria-label': `${n}er-Reihe: ${row.open ? STAGE_NAMES[row.stage] : 'gesperrt'}` },
      h('b', {}, `${n}er`), boxes, right);
  });
  return h('section', { class: 'card' },
    h('h2', {}, 'Inseln'),
    h('p', { class: 'soft' }, 'Jedes Kästchen ist eine Aufgabe der Reihe (1· bis 10·).'),
    h('div', { class: 'row-table' }, lines),
    h('div', { class: 'legend' },
      h('span', {}, h('i', { style: { background: '#e3eaee' } }), 'neu'),
      h('span', {}, h('i', { style: { background: '#ffd2a8' } }), 'gerade gelernt'),
      h('span', {}, h('i', { style: { background: '#ffe58a' } }), 'sicher'),
      h('span', {}, h('i', { style: { background: '#7fd39b' } }), 'hält über Tage'),
      h('span', {}, h('i', { style: { background: 'var(--leaf)' } }), 'sitzt fest')));
}

const seconds = (ms) => Math.round(ms / 1000);

// Fehler und zu langsame Antworten (zuletzt über der Zeitgrenze, z. B. hochgezählt).
function weak(s) {
  const limit = speedLimit(s);
  const isSlow = (c) => c.box >= 1 && c.lastMs !== null && c.lastMs > limit;
  const list = Object.entries(s.cards)
    .filter(([key, c]) => (c.wrong > 0 || isSlow(c)) && s.rows[parseKey(key).n].open)
    .sort(([, a], [, b]) => b.wrong - a.wrong || (isSlow(b) ? b.lastMs : 0) - (isSlow(a) ? a.lastMs : 0))
    .slice(0, 12);
  return h('section', { class: 'card' },
    h('h2', {}, 'Hängt noch'),
    list.length
      ? h('div', { class: 'weak-list' }, list.map(([key, c]) => {
        const { k, n } = parseKey(key);
        const notes = [c.wrong > 0 && `${c.wrong}× falsch`, isSlow(c) && `zuletzt ${seconds(c.lastMs)} s`].filter(Boolean);
        return h('span', {}, h('b', {}, `${k} · ${n}`), ` ${notes.join(', ')}`);
      }))
      : h('p', { class: 'soft' }, 'Bisher keine Fehler und nichts zu Langsames. Aufgaben mit Fehlern oder langer Antwortzeit erscheinen hier.'));
}

function tempo(s) {
  const check = async () => {
    const t = today();
    const preview = tempoRecheck(s, t);
    if (!preview.demoted.length && !preview.locked.length) {
      toast('Alles blitzschnell genug – es ändert sich nichts.');
      return;
    }
    const parts = [
      preview.demoted.length === 1
        ? '1 Aufgabe muss wieder blitzschnell gewusst werden.'
        : `${preview.demoted.length} Aufgaben müssen wieder blitzschnell gewusst werden.`,
      preview.locked.length
        ? `Wieder gesperrt: ${preview.locked.map((n) => `${n}er`).join(', ')}.`
        : 'Keine Insel wird gesperrt.',
      preview.focus !== null && `Weiter geübt wird die ${preview.focus}er-Reihe.`,
      'Sticker bleiben. Tipp: vorher einen Sicherungscode erstellen.',
    ].filter(Boolean);
    const yes = await ask({ title: 'Lernstand anpassen?', text: parts.join(' '), ok: 'Anpassen', danger: true });
    if (!yes) return;
    tempoRecheck(s, t, { apply: true });
    persist();
    go('parents', { open: true });
    toast('Lernstand angepasst.');
  };
  return h('section', { class: 'card' },
    h('h2', {}, 'Inseln nach Tempo prüfen'),
    h('p', {}, `Wendet die Zeitgrenze (${seconds(speedLimit(s))} s) auf den bisherigen Lernstand an: Aufgaben, deren letzte Antwort länger gedauert hat, müssen wieder blitzschnell gewusst werden. Inseln ohne Silber werden wieder gesperrt – bis auf eine zum Weiterüben.`),
    h('p', { class: 'soft', style: { fontSize: '15px' } }, 'Vor dem Anpassen zeigt die App, was sich ändert. Sticker bleiben.'),
    h('button', { class: 'btn btn-small btn-sun', onclick: check }, 'Jetzt prüfen'));
}

function backup(s) {
  const out = h('div', { hidden: true, style: { display: 'grid', gap: '10px' } });
  const create = () => {
    const code = encodeBackup(s);
    s.backupDay = today();
    persist();
    const area = h('textarea', { class: 'code', readonly: true, 'aria-label': 'Sicherungscode' });
    area.value = code;
    fill(out,
      h('p', {}, 'Diesen Code irgendwo sicher aufheben, z. B. als Nachricht an dich selbst oder als Notiz.'),
      area,
      h('div', { class: 'btn-row' },
        h('button', {
          class: 'btn btn-small btn-sun',
          onclick: async () => {
            try {
              await navigator.clipboard.writeText(code);
              toast('Code kopiert.');
            } catch {
              area.select();
              document.execCommand?.('copy');
              toast('Code markiert – bitte kopieren.');
            }
          },
        }, 'Kopieren'),
        navigator.share && h('button', {
          class: 'btn btn-small',
          onclick: () => navigator.share({ title: 'Mal-Inseln Sicherung', text: code }).catch(() => {}),
        }, 'Teilen')));
    out.hidden = false;
  };

  const input = h('textarea', { class: 'code', placeholder: 'Sicherungscode hier einfügen', 'aria-label': 'Sicherungscode einfügen' });
  const restore = async () => {
    let state;
    try {
      state = decodeBackup(input.value, today());
    } catch (err) {
      toast(err.message, 4000);
      return;
    }
    const yes = await ask({
      title: 'Sicherung einspielen?',
      text: 'Der Fortschritt auf diesem Handy wird durch den Stand aus dem Code ersetzt.',
      ok: 'Einspielen',
      danger: true,
    });
    if (!yes) return;
    app.state = state;
    app.state.backupDay = today();
    sound.setEnabled(app.state.settings.sound);
    persist();
    go('home');
    toast('Sicherung eingespielt.');
  };

  return h('section', { class: 'card' },
    h('h2', {}, 'Sicherung'),
    h('p', {}, 'Der Fortschritt liegt nur auf diesem Handy. Mit einem Sicherungscode lässt er sich aufheben und wiederherstellen, auch auf einem neuen Handy.'),
    h('p', { class: 'soft' }, s.backupDay ? `Letzte Sicherung: ${dateText(s.backupDay)}` : 'Noch keine Sicherung erstellt.'),
    h('button', { class: 'btn btn-small btn-sun', onclick: create }, 'Sicherungscode erstellen'),
    out,
    h('details', {},
      h('summary', { style: { cursor: 'pointer', fontWeight: 700, minHeight: '44px', paddingTop: '10px' } }, 'Sicherung einspielen'),
      h('div', { style: { display: 'grid', gap: '10px', marginTop: '8px' } },
        input,
        h('button', { class: 'btn btn-small', onclick: restore }, 'Einspielen'))));
}

function settings(s) {
  const name = h('input', { class: 'field', maxlength: '20', value: s.name, 'aria-label': 'Name des Kindes' });
  const soundBtn = h('button', {
    class: 'btn btn-small',
    'aria-pressed': String(s.settings.sound),
    onclick: () => {
      s.settings.sound = !s.settings.sound;
      sound.setEnabled(s.settings.sound);
      persist();
      soundBtn.textContent = s.settings.sound ? 'Töne an' : 'Töne aus';
      soundBtn.setAttribute('aria-pressed', String(s.settings.sound));
    },
  }, s.settings.sound ? 'Töne an' : 'Töne aus');
  const goalButtons = DAY_GOAL_OPTIONS.map((value) => h('button', {
    class: `btn btn-small ${dayGoalTarget(s) === value ? 'btn-sun' : ''}`,
    'aria-pressed': String(dayGoalTarget(s) === value),
    onclick: () => {
      s.settings.dayGoal = value;
      persist();
      goalButtons.forEach((b, i) => {
        const on = DAY_GOAL_OPTIONS[i] === value;
        b.classList.toggle('btn-sun', on);
        b.setAttribute('aria-pressed', String(on));
      });
      toast(`Tagesziel: ${value} richtige Aufgaben.`);
    },
  }, String(value)));
  const speedButtons = SPEED_OPTIONS.map((value) => h('button', {
    class: `btn btn-small ${speedLimit(s) === value ? 'btn-sun' : ''}`,
    'aria-pressed': String(speedLimit(s) === value),
    onclick: () => {
      s.settings.speedMs = value;
      persist();
      speedButtons.forEach((b, i) => {
        const on = SPEED_OPTIONS[i] === value;
        b.classList.toggle('btn-sun', on);
        b.setAttribute('aria-pressed', String(on));
      });
      toast(`Blitzschnell heißt jetzt: bis ${seconds(value)} Sekunden.`);
    },
  }, `${seconds(value)} s`));
  return h('section', { class: 'card' },
    h('h2', {}, 'Einstellungen'),
    h('div', { style: { display: 'grid', gap: '8px' } },
      h('p', { style: { fontWeight: 700 } }, 'Blitzschnell: Zeit bis zur Antwort'),
      h('p', { class: 'soft', style: { fontSize: '15px' } }, 'Nur eine richtige Antwort in dieser Zeit (samt Eintippen) zählt als „sitzt“. Langsamere Antworten zählen fürs Tagesziel, die Aufgabe wird aber weiter geübt.'),
      h('div', { class: 'btn-row', role: 'group', 'aria-label': 'Zeit für blitzschnell' }, speedButtons)),
    h('div', { style: { display: 'grid', gap: '8px' } },
      h('p', { style: { fontWeight: 700 } }, 'Tagesziel: richtige Aufgaben pro Tag'),
      h('p', { class: 'soft', style: { fontSize: '15px' } }, 'Eine Runde hat 15 Aufgaben. 30 sind etwa zwei Runden (6–8 Minuten). Ein schon erreichtes Tagesziel bleibt erreicht.'),
      h('div', { class: 'btn-row', role: 'group', 'aria-label': 'Tagesziel' }, goalButtons)),
    h('label', { style: { fontWeight: 700 } }, 'Name', name),
    h('div', { class: 'btn-row' },
      h('button', {
        class: 'btn btn-small btn-sun',
        onclick: () => { s.name = name.value.trim().slice(0, 20); persist(); toast('Name gespeichert.'); },
      }, 'Name speichern'),
      soundBtn),
    s.settings.installHint === false && h('button', {
      class: 'btn-quiet btn',
      onclick: () => { s.settings.installHint = true; persist(); toast('Hinweis wird wieder angezeigt.'); },
    }, 'Hinweis „Als App aufs Handy legen“ wieder zeigen'));
}

function reset() {
  return h('section', { class: 'card' },
    h('h2', {}, 'Neu anfangen'),
    h('p', { class: 'soft' }, 'Löscht allen Fortschritt und alle Sticker auf diesem Handy.'),
    h('button', {
      class: 'btn btn-small btn-danger',
      onclick: async () => {
        const first = await ask({ title: 'Alles zurücksetzen?', text: 'Alle Stufen, Sticker und Übungstage gehen verloren.', ok: 'Weiter', danger: true });
        if (!first) return;
        const second = await ask({ title: 'Wirklich alles löschen?', text: 'Das lässt sich ohne Sicherungscode nicht rückgängig machen.', ok: 'Alles löschen', danger: true });
        if (!second) return;
        app.state = newState(today());
        sound.setEnabled(app.state.settings.sound);
        persist();
        go('welcome');
      },
    }, 'Alles zurücksetzen'));
}

export function parents(root, params = {}) {
  if (!params.open) return gate(root);
  const s = app.state;
  const t = today();
  const notes = [];
  if (!app.saveOk) notes.push('Achtung: Der Browser lässt gerade kein Speichern zu (z. B. im privaten Modus). Bitte Mal-Inseln in einem normalen Fenster oder als App öffnen.');
  if (backupDue(s, t)) notes.push('Zeit für eine neue Sicherung – unten „Sicherungscode erstellen“ antippen.');

  const persistNote = h('p', { class: 'soft', style: { fontSize: '14px' } });
  navigator.storage?.persisted?.().then((ok) => {
    persistNote.textContent = ok
      ? 'Der Browser hat dauerhaften Speicher zugesagt.'
      : 'Der Browser hat keinen dauerhaften Speicher zugesagt. Als App auf dem Startbildschirm ist der Fortschritt am sichersten.';
  }).catch(() => {});

  add(root, 
    h('header', { class: 'sub-head' },
      h('button', { class: 'icon-btn', 'aria-label': 'Zurück zur Inselkarte', onclick: () => go('home') }, '←'),
      h('h1', {}, 'Für Eltern')),
    h('div', { class: 'parents' },
      notes.map((n) => h('p', { class: 'note' }, n)),
      overview(s),
      islands(s),
      weak(s),
      tempo(s),
      backup(s),
      settings(s),
      reset(),
      h('div', { style: { display: 'grid', gap: '6px', padding: '0 6px' } },
        persistNote,
        h('p', { class: 'soft', style: { fontSize: '14px' } }, 'Mal-Inseln speichert alles nur auf diesem Gerät und sendet keine Daten ins Internet.'))));
}
