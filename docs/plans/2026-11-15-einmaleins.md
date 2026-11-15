# Einmaleins-App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Offline-fähige Handy-Web-App (PWA) fürs kleine Einmaleins mit Karteikasten-Lernmodell, Stufen, Stickern und Eltern-Bereich.

**Architecture:** Statische Seite ohne Build-Schritt. Reine, DOM-freie ES-Module für Lernmodell, Rundenbau, Hilfen, Sticker und Speicher (mit `node --test` getestet); darüber eine dünne Oberfläche aus Bildschirm-Modulen. Service Worker cacht die App-Dateien; Fortschritt liegt in `localStorage`.

**Tech Stack:** Vanilla JS (ES-Module), CSS, Web Audio, Service Worker, Node 26 (`node --test`) für Tests, kleines Node-Skript für PNG-Symbole und lokalen Server.

**Spec:** `C:\claude\einmaleins\docs\2026-11-15-einmaleins-design.md`

## Global Constraints

- Malpunkt `·` in allen Aufgaben, Texte Deutsch, kurz, kindgerecht, nicht babyhaft.
- Reihenfolge `ROW_ORDER = [2, 10, 5, 1, 4, 8, 3, 6, 9, 7]`; Karte `k·n` = Aufgabe k mal n in Reihe n, k = 1…10.
- Fächer 0–5; fällig nach Fach: 1 → 1 Tag, 2 → 1 Tag, 3 → 3 Tage, 4 → 7 Tage, 5 → 21 Tage.
- Flott = ≤ 5000 ms vom Erscheinen bis OK. Zeit nie sichtbar außer in der Rekordjagd (60 s).
- Stufen: 1 Bronze (alle Fach ≥ 1), 2 Silber (≥ 2, schaltet frei), 3 Gold (≥ 4), 4 Meister (= 5). Stufen und Sticker werden nie entzogen.
- Tagestraining 15 Aufgaben; falsche Karte max. 2× pro Runde neu einreihen, 2–3 Plätze später; nach 2 Fehlern in Folge eine sichere Karte einschieben.
- Ziel-Browser: iOS Safari ≥ 16.4, aktuelles Android-Chrome. Tippflächen ≥ 48 px.
- Speichern nach jeder Antwort; Datenformat versioniert (`v: 1`).
- Keine Daten verlassen das Gerät. Keine externen Skripte; Schriften dürfen per Google Fonts kommen (vom Service Worker gecacht, Systemschrift als Rückfall).

## Review Focus

1. **Tageswechsel mitten in einer Runde / App über Nacht offen** – Fälligkeiten rechnen mit dem Tag der Antwort, nicht dem Rundenstart. → Test in Task 1 (`applyAnswer` nimmt `today` je Antwort).
2. **Kaputter oder fremder Speicherinhalt / Sicherungscode mit Tippfehler** – darf die App nicht leeren; ungültiger Code wird abgelehnt, alter Stand bleibt. → Tests in Task 4.
3. **Nur eine Reihe offen (erste Tage)** – Tagestraining darf nicht abstürzen oder Karten doppelt nebeneinander zeigen, wenn weniger als 15 Karten existieren. → Test in Task 2.
4. **Pauken am selben Tag** – zehnmal üben hebt keine Karte über Fach 2. → Test in Task 1.
5. **Eltern schalten Reihen außer der Reihe frei** – Fokus-Reihe und automatische Freischaltung bleiben stimmig. → Test in Task 1.

---

## Dateien

```
einmaleins/
  index.html               App-Hülle, lädt css + js/app.js
  manifest.webmanifest
  sw.js                    Service Worker (Cache-Version als Konstante)
  css/app.css
  icons/                   icon-192.png, icon-512.png, apple-touch-icon.png, icon.svg
  js/
    days.js                Tagesnummern, Wochenbeginn
    model.js               Karten, Fächer, Stufen, Freischaltung, Fokus-Reihe
    rounds.js              Rundenbau + Round-Ablauf (Einreihen)
    hints.js               Rechenwege + Punktefeld-Daten
    stickers.js            Katalog + Vergabe
    storage.js             Laden/Speichern/Migration/Sicherungscode
    sound.js, fx.js        Klänge, Konfetti (UI)
    app.js + ui/*.js       Bildschirme: home, play, result, album, parents, onboarding
  tests/*.test.js
  tools/serve.mjs          lokaler Testserver
  tools/make-icons.mjs     PNG-Symbole erzeugen
  package.json             {"type":"module","scripts":{"test":"node --test tests/"}}
```

Commits: Ordner ist kein Git-Repo; es wird nicht committet, solange der Auftraggeber es nicht wünscht.

### Task 1: Tage + Lernmodell

**Files:** Create `js/days.js`, `js/model.js`, `tests/model.test.js`, `package.json`

**Interfaces – Produces:**
- `days.js`: `dayNum(date = new Date()): number` (lokales Kalenderdatum → fortlaufende Tagesnummer), `weekStart(day: number): number` (Montag der Woche).
- `model.js`:
  - Konstanten `ROW_ORDER`, `INTERVALS = {1:1,2:1,3:3,4:7,5:21}`, `FAST_MS = 5000`, `STAGE_MIN_BOX = {1:1,2:2,3:4,4:5}`.
  - `newState(today: number): State` – Reihe 2 offen, alle 100 Karten `{box:0, due:null, right:0, wrong:0, lastMs:null}`.
  - `cardKey(k, n): string` → `"7x6"`; `parseKey(key): {k, n}`.
  - `applyAnswer(state, key, {correct: boolean, ms: number, today: number}): AnswerResult` – mutiert `state`, liefert `{oldBox, newBox, stageUps: [{row, stage}], unlocked: [row]}`.
  - `rowStage(state, n): 0..4` (gespeichert, nie sinkend), `rowWeakCount(state, n, today)`.
  - `unlockedRows(state): number[]` in `ROW_ORDER`-Reihenfolge; `focusRow(state): number|null`; `manualUnlock(state, n, now)`.
  - `dueKeys(state, today): string[]` (offene Reihen, `box ≥ 1 && due ≤ today`, sortiert nach `due`, dann `box`).
  - `markDiscovered(state, n)`, `isDiscovered(state, n)`.

Regeln (aus Spec 5.2/5.3), die der Code festlegt:
- richtig: `box < 2` → `box+1`; `box ≥ 2` und flott und fällig (`due ≤ today`) → `box+1` (max 5); sonst unverändert. Nach Aufstieg `due = today + INTERVALS[newBox]`; ohne Aufstieg `due` unverändert.
- falsch: `box = min(box, 1)`, `due = today`, `wrong++`.
- Freischalt-Invariante: Anzahl offener Reihen ≥ 1 + Anzahl Reihen mit Stufe ≥ 2; fehlende werden in `ROW_ORDER` nachgeschoben (überspringt offene). Jede Freischaltung bekommt eine laufende Nummer `seq`.
- Fokus-Reihe: offene Reihe mit höchstem `seq` und Stufe < 2.

- [ ] **Step 1: Failing tests** in `tests/model.test.js`:
  - `newState: nur Reihe 2 offen, 100 Karten in Fach 0`
  - `richtig hebt 0→1→2 auch langsam` (ms 9000 zweimal → box 2)
  - `pauken am selben Tag bleibt bei Fach 2` (10× richtig flott, gleicher `today` → box 2)
  - `fällig + flott steigt über 2` (box 2, due ≤ today, ms 2000 → box 3, due = today+3)
  - `langsam steigt nicht über 2` (box 2 fällig, ms 8000 → box 2)
  - `falsch setzt auf 1, aus 0 bleibt 0, due = heute`
  - `Bronze/Silber für Reihe 2 und Freischaltung der 10` (alle 10 Karten zweimal richtig → stageUps enthält {row:2,stage:2}, unlocked = [10])
  - `Stufe sinkt nie` (nach Silber eine Karte falsch → rowStage bleibt 2)
  - `manuelle Freischaltung 7 wird Fokus; Auto-Freischaltung überspringt offene`
  - `Tageswechsel: due rechnet mit today der Antwort`
- [ ] **Step 2:** `npm test` → FAIL (Module fehlen).
- [ ] **Step 3:** `days.js` und `model.js` implementieren.
- [ ] **Step 4:** `npm test` → alle PASS.

### Task 2: Rundenbau und Rundenablauf

**Files:** Create `js/rounds.js`, `tests/rounds.test.js`

**Interfaces:**
- Consumes: `model.js` (oben).
- Produces:
  - `Task = {key, swapped: boolean, hop: boolean}`
  - `buildDailyRound(state, today, rng = Math.random): {mode:'daily', discoverRow: number|null, tasks: Task[]}`
  - `buildRowRound(state, n, rng): {mode:'row', discoverRow: number|null, tasks: Task[]}`
  - `pickBlitzTask(state, rng, lastKey): Task` (gewichtet zu niedrigen Fächern, nie zweimal dieselbe Karte hintereinander)
  - `class Round { constructor(tasks, {easyPool: string[]}); current: Task|null; done: number; total: number; submit(correct: boolean): void; streakWrong: number }`

Regeln: Entdecker-Runde = 10 Karten der Reihe in Reihenfolge 1…10, `hop = box === 0`. Tagestraining mit nicht entdeckter Fokus-Reihe: Entdecker-Runde + bis 5 fällige Karten anderer Reihen. Sonst: fällige bis 8, dann Fokus-Reihe (niedrigste Fächer zuerst), dann Auffüllen aus allen offenen Reihen bis 15 bzw. so viele verschiedene Karten es gibt; gemischt, keine Karte doppelt. `swapped` nur wenn Reihenstufe ≥ 3, mit Wahrscheinlichkeit 0,25. Round: falsch → Karte 2–3 Plätze später erneut (max 2× je Karte); 2 Fehler in Folge → nächste Aufgabe aus `easyPool`.

- [ ] **Step 1: Failing tests:** `erste Runde = Entdecker 2er in Reihenfolge mit hop`, `nur 10 Karten offen → Runde mit 10 verschiedenen Karten`, `fällige Karten kommen zuerst rein (max 8)`, `nie dieselbe Karte zweimal in der Aufgabenliste`, `Round: falsch wird 2–3 später wiederholt, höchstens 2×`, `Round: nach 2 Fehlern in Folge kommt easyPool-Karte`, `swapped nie unter Gold`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** implementieren.
- [ ] **Step 4:** `npm test` → PASS.

### Task 3: Rechenwege

**Files:** Create `js/hints.js`, `tests/hints.test.js`

**Produces:** `hintFor(k, n): {lines: string[], dots: {rows: k, cols: n, splitAfter: 5|null}}`

Strategie nach k: 1 → „1 · n = n“; 2 → Verdoppeln (n + n); 3 → 2·n + n; 4 → Doppelte von 2·n; 5 → Hälfte von 10·n; 6 → 5·n + n; 7 → 5·n + 2·n; 8 → 10·n − 2·n; 9 → 10·n − n; 10 → „10 · n = …“ (n Zehner). Letzte Zeile immer `k · n = Ergebnis`. `splitAfter = 5` wenn k > 5.

- [ ] **Step 1: Failing tests:** `jede der 100 Aufgaben endet mit korrektem Ergebnis`, `7·6 nutzt 5·6 + 2·6`, `9·4 nutzt 10·4 − 4`.
- [ ] **Step 2–4:** FAIL → implementieren → PASS.

### Task 4: Sticker und Speicher

**Files:** Create `js/stickers.js`, `js/storage.js`, `tests/stickers.test.js`, `tests/storage.test.js`

**Produces:**
- `STICKERS: {id, emoji, name, group, holo?: boolean, fallback: string}[]` – 10 Reihen-Gruppen × 4 (Stufe 1–4, Stufe 4 `holo`), Tages-Pool (~24), Besondere (~10), Wochen-Pool (~12).
- `awardStickers(state, ev, rng): string[]` mit `ev = {today, stageUps, roundDone?: {perfect, mode}, bestStreak, blitzRecord?: boolean}`; prüft Tagesziel (1. Tagestraining des Tages → 1 Tages-Sticker, max 1/Tag), Wochenstempel (4 Übungstage Mo–So → 1 Wochen-Sticker je Woche), Besondere (erste Runde, fehlerfrei, 10/25 in Folge, 5/15/30 Übungstage, Wackel-Aufgabe ≥ 3 Fehler bis Fach 4, Rekord, alle offen, alle Meister). Speichert `{day}` je Sticker.
- `storage.js`: `load(storage = localStorage, today): State`, `save(state, storage)`, `encodeBackup(state): string` (Präfix `EMM1-`, base64url-JSON, Prüfsumme), `decodeBackup(text): State` (wirft bei Fehler), `requestPersist(): Promise<boolean>`.

- [ ] **Step 1: Failing tests:** `Stufenaufstieg 2er Silber gibt Sticker der 2er-Gruppe Stufe 2`, `Tages-Sticker nur einmal pro Tag`, `Wochen-Sticker bei 4 Tagen`, `kein Sticker doppelt`, `load mit kaputtem JSON → neuer Stand, kein Absturz`, `Backup hin und zurück identisch`, `Backup mit Tippfehler → wirft, nichts überschrieben`.
- [ ] **Step 2–4:** FAIL → implementieren → PASS.

### Task 5: Oberfläche

**Files:** Create `index.html`, `css/app.css`, `js/app.js`, `js/ui/*.js`, `js/sound.js`, `js/fx.js`

Vorher Skill `frontend-design` laden. Bildschirme laut Spec 9: Onboarding (Name), Start (Begrüßung, Tagestraining-Knopf mit Hinweis, Reise-Karte 10 Stationen mit Stufe, Stempelkarte, Rekordjagd ab 3 Reihen, Album, Eltern-Symbol), Aufgabe (Fortschritt, Aufgabe, Eingabefeld, Zahlenfeld 1–9/⌫/0/OK, Hüpf-Hilfe bei `hop`, Fehler-Ansicht mit `hintFor` + Lösung abtippen), Ergebnis (richtig, neue Stufen, Sticker auspacken, Konfetti), Album (Gruppen, Fortschritt x/y), Eltern (Rechensperre 17·4 o. ä., Überblick, „hängt noch“, Reihen freischalten, Sicherungscode erzeugen/einspielen, Name, Ton, Zurücksetzen mit Rückfrage, Erinnerung nach 14 Tagen ohne Sicherung), Rekordjagd (60 s). Emoji-Prüfung per Canvas, sonst `fallback`. iPhone-Hinweis „Zum Home-Bildschirm“, wenn nicht `standalone`. `prefers-reduced-motion` beachten.

- [ ] **Step 1:** Seite im lokalen Server öffnen (Task 6 `tools/serve.mjs` vorziehen), Durchklick: erste Runde → Entdecker 2er → Ergebnis → Album zeigt Sticker.
- [ ] **Step 2:** Fehler-Ansicht und Eltern-Bereich durchklicken; Konsole ohne Fehler.

### Task 6: Offline + Symbole + Testserver

**Files:** Create `sw.js`, `manifest.webmanifest`, `tools/serve.mjs`, `tools/make-icons.mjs`, `icons/*`, `.claude/launch.json` (in `C:\claude\einmaleins`)

- `sw.js`: Precache aller App-Dateien unter `CACHE = 'emm-v1'`; Navigationen cache-first mit Netz-Aktualisierung; Google-Fonts per Laufzeit-Cache; alte Caches beim `activate` löschen. Fasst `localStorage` nie an.
- `make-icons.mjs`: Punktefeld-Motiv per Supersampling rastern, PNG mit `zlib` schreiben (192, 512, 180).
- [ ] **Step 1:** `node tools/make-icons.mjs` → drei PNGs vorhanden.
- [ ] **Step 2:** Im Browser: Service Worker aktiv, Seite lädt bei Offline-Simulation (Server stoppen, neu laden).

### Task 7: Handytest

- [ ] Browserfenster auf 375×812 (mobil) und 320 px Breite; kompletter Durchlauf: Onboarding → 3 Runden → Silber 2er → 10er frei → Album → Eltern → Sicherungscode hin/zurück. Keine waagerechte Scrollleiste, keine Konsolenfehler.
- [ ] `npm test` → alle PASS.
