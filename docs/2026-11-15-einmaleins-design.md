# Einmaleins-App – Entwurf

Stand: 15.11.2026 · Status: Entwurf zur Freigabe

Kennzeichnung: **[Vorgabe]** = so vom Auftraggeber gewünscht. **[Vorschlag]** = von Claude entschieden („freie Hand“), korrigierbar.

## 1. Worum es geht und warum

Eine Lern-App fürs kleine Einmaleins (1er- bis 10er-Reihe) für **ein** Kind in der 3. Klasse, auf **einem** Handy, ohne Anmeldung. **[Vorgabe]**

Das eigentliche Ziel ist nicht eine Abfragemaschine, sondern: Das Kind kommt über Wochen **freiwillig** wieder, und am Ende sitzt das Einmaleins wirklich – abrufbar aus dem Gedächtnis, nicht abgezählt. „Nur wenn die App Spaß macht, lernt das Kind auch freiwillig.“ **[Vorgabe]**

Erfolg heißt:
- Das Kind übt ohne Aufforderung an den meisten Tagen ein paar Minuten.
- Nach einigen Wochen sind alle Reihen auf hoher Stufe, und die Antworten kommen schnell (unter ~5 Sekunden inkl. Eintippen).

## 2. Ziele, Nicht-Ziele, Anti-Ziele

**Ziele**
- Reihen einzeln üben; Reihen werden nacheinander freigeschaltet; gemischte Abfragen über alle freigeschalteten Reihen. **[Vorgabe]**
- Was noch nicht sitzt, wird gezielt wiederholt. **[Vorgabe]**
- Erfolgsstufen pro Reihe – je sicherer, desto höher. **[Vorgabe]**
- Sticker zum Sammeln. **[Vorgabe]**
- Läuft auf dem Handy wie eine App (Startbildschirm-Symbol, offline). **[Vorschlag]**

**Nicht-Ziele (bewusst weggelassen)**
- Geteilt-Aufgaben (Umkehraufgaben), großes Einmaleins, Null-Reihe.
- Mehrere Kinder/Profile, Synchronisierung zwischen Geräten, Konten, Server.
- Ranglisten, Vergleich mit anderen Kindern, Werbung, Käufe.

**Anti-Ziele (wäre ein Fehlschlag, selbst wenn alles „funktioniert“)**
- **Fortschritt geht verloren.** Wochenlang gesammelte Stufen/Sticker weg = Motivation weg.
- **Druck und Schuld:** sichtbarer Countdown im normalen Üben, Strafen für ausgelassene Tage, verlorene Serien, weggenommene Stufen oder Sticker.
- **Belohnung ohne Lernen:** Sticker oder Stufen, die man durch Herumklicken oder Pauken an einem Tag „farmen“ kann.
- **Frust-Spiralen:** viele Fehler hintereinander, Aufgaben, die endlos wiederkommen.
- **Babyhaft:** Drittklässler (8–9 Jahre) wollen ernst genommen werden – fröhlich, aber nicht kleinkindlich.

## 3. Rahmen

- **Vorkenntnisse:** Das Kind fängt fast neu an. **[Vorgabe]** Deshalb kein Einstufungstest; alle Reihen starten gesperrt bzw. in Fach 0, Einstieg mit der 2er-Reihe. Reihen, die die Schule gerade macht, schalten die Eltern von Hand frei (8).
- **Gerät:** ein Handy, Hochformat, Daumenbedienung. **[Vorgabe: ein Kind, ein Handy, keine Anmeldung]** Modell noch unbekannt, daher **[Vorschlag]**: Ziel sind iOS ab 16.4 und ein aktuelles Android-Chrome. Für alles, was auf älteren Geräten fehlen kann, gibt es einen Ersatz: Teilen-Funktion → Kopieren; fehlende Emoji → Ersatzmotiv; kein dauerhafter Speicher → Hinweis an die Eltern.
- **Speicher:** nur lokal im Browser des Handys. Deshalb: Sicherungscode + dauerhaften Speicher anfordern (siehe 7.4). **[Vorschlag]**
- **Sprache:** Deutsch, kindgerecht, kurze Sätze. Malpunkt „·“ wie in der Schule (nicht „x“ oder „*“).
- **Keine Abhängigkeit von claude.ai.** Die App ist eine eigenständige Website.

## 4. Lösungswege (Approaches)

| Weg | Wie | Vorteil | Nachteil | Entscheidung |
|---|---|---|---|---|
| A | claude.ai-Artifact, Fortschritt im claude.ai-Konto | Fortschritt sicher, auslesbar | Handy muss bei claude.ai angemeldet sein | verworfen – Handy ist nicht angemeldet |
| **B** | **Eigenständige Web-App (PWA) auf eigener Adresse, Fortschritt lokal + Sicherungscode** | Startbildschirm-Symbol, offline, keine Anmeldung, stabilerer Speicher als im Artifact | braucht einen Ort zum Ablegen (z. B. GitHub Pages / Netlify) | **gewählt** |
| C | Artifact wie Baum-Detektiv, nur Browser-Speicher | am einfachsten | Speicher im Artifact kann leer zurückkommen – über Wochen zu riskant | verworfen |

Gewählt wurde B, weil das Handy nicht bei claude.ai angemeldet ist und verlorener Fortschritt das größte Risiko für die Langzeitmotivation ist.

## 5. Lernmodell (Herzstück)

### 5.1 Karten
- Jede Reihe *n* hat 10 Aufgaben: `1·n, 2·n, … 10·n` (Schulschreibweise der Malreihe). Insgesamt 100 Karten.
- `3·7` (7er-Reihe) und `7·3` (3er-Reihe) sind **getrennte** Karten. Das ist einfach und übt nebenbei die Tauschaufgabe.
- **[Vorschlag]** Ab Stufe „Gold“ einer Reihe wird eine Karte gelegentlich (≈ jede 4.) in Tauschform gezeigt (`7·3` statt `3·7`), zählt aber als dieselbe Karte.

### 5.2 Fächer (Karteikasten-Prinzip, wie Leitner)
Jede Karte liegt in einem Fach 0–5. Das Fach bestimmt, wann sie wieder drankommt.

| Fach | Bedeutung | Wieder fällig nach |
|---|---|---|
| 0 | neu, noch nie richtig | – (wird eingeführt) |
| 1 | gerade gelernt / zuletzt falsch | gleiche Runde, dann am nächsten Tag |
| 2 | zweimal richtig (auch langsam) | 1 Tag |
| 3 | an einem späteren Tag wieder gewusst | 3 Tage |
| 4 | | 7 Tage |
| 5 | sitzt fest | 21 Tage (Pflege-Wiederholung) |

Regeln:
- **Richtig & flott** (≤ 5 s vom Erscheinen bis zum Bestätigen): ein Fach hoch.
- **Richtig, aber langsam** (> 5 s): höchstens bis Fach 2; darüber bleibt die Karte, wo sie ist (gewusst, aber noch nicht automatisiert). Kein negatives Feedback für langsam – die Zeit wird **unsichtbar** gemessen.
- **Falsch:** zurück auf Fach 1, kommt in derselben Runde 2–3 Aufgaben später wieder (höchstens 2-mal pro Runde, damit nichts endlos kreist).
- **Abstand schützt vor Pauken:** Über Fach 2 hinaus steigt eine Karte nur, wenn sie **fällig** war (Wartezeit abgelaufen). Wer an einem Tag zehnmal die 7er übt, kommt also schnell auf „Silber“, aber nicht auf „Gold“. Gold und Meister beweisen, dass es über Tage hält.
- Tageswechsel = lokales Kalenderdatum.

### 5.3 Erfolgsstufen pro Reihe **[Vorgabe: Stufen; Vorschlag: Ausgestaltung]**

| Stufe | Bedingung (alle 10 Karten der Reihe) | Typische Dauer |
|---|---|---|
| Entdeckt (Bronze) | jede mindestens 1× richtig (Fach ≥ 1) | 1. Runde |
| Sicher (Silber) | Fach ≥ 2 | 1–2 Runden → **schaltet nächste Reihe frei** |
| Profi (Gold) | Fach ≥ 4 | ca. 1 Woche |
| Meister (Kristall) | Fach 5 | ca. 2–3 Wochen |

- **Stufen werden nie aberkannt.** Rutscht eine Karte wieder ab, wird sie einfach wiederholt; die Reihe zeigt sanft „2 Aufgaben wollen geübt werden“.
- Freischaltung über **Silber**, damit das Weiterkommen nicht an Wartezeiten hängt. Gold/Meister sind der Grund, über Wochen wiederzukommen.

### 5.4 Reihenfolge der Reihen **[Vorschlag]**
`2 → 10 → 5 → 1 → 4 → 8 → 3 → 6 → 9 → 7`

Begründung: 2, 10, 5 sind die „Kernreihen“, aus denen Kinder andere ableiten; die 1er ist ein leichter Erfolg zwischendurch; 4 und 8 bauen durch Verdoppeln auf 2 auf, 6 auf 3; 9 über „10 minus 1“; die 7er als schwerste zuletzt.

Im Eltern-Bereich lassen sich Reihen auch von Hand freischalten – falls die Schule gerade eine andere Reihe dran hat.

### 5.5 Erste Begegnung mit einer neuen Reihe **[Vorschlag]**
Die allererste Runde einer Reihe ist eine „Entdecker-Runde“: Die Aufgaben kommen **der Reihe nach** (1·n, 2·n, …), mit Hüpf-Hilfe am Zahlenstrahl (die Reihe springt in n-er Schritten). Ab der zweiten Runde wird gemischt.

Das gilt für beide Wege in eine neue Reihe:
- **Reihe üben:** Die erste Runde einer neuen Reihe ist die Entdecker-Runde.
- **Tagestraining:** Hat die Fokus-Reihe (siehe 6.1) noch Karten in Fach 0, beginnt das Tagestraining mit der Entdecker-Runde dieser Reihe (10 Aufgaben der Reihe nach), danach folgen bis zu 5 fällige Wiederholungen aus anderen Reihen.
- Die Hüpf-Hilfe erscheint nur bei Karten in Fach 0, nie bei bereits gelernten Karten.

### 5.6 Hilfe bei Fehlern **[Vorschlag]**
Bei einer falschen Antwort kein „Falsch!“-Ton, sondern freundlich die richtige Lösung **mit einem Rechenweg**, passend zur Aufgabe:
- **Punktefeld:** z. B. 7·6 als 7 Reihen à 6 Punkte, mit Trennlinie bei 5 (5·6 = 30 und 2·6 = 12 → 42).
- **Ableitung von einer Kernaufgabe:** „10·6 = 60, dann 9·6 = 60 − 6 = 54“; „4·8 ist das Doppelte von 2·8“.

Das Kind tippt danach die richtige Lösung einmal selbst ein (aktives Abrufen), bevor es weitergeht.

## 6. Spielarten **[Vorschlag]**

1. **Tagestraining** (großer Hauptknopf): 15 Aufgaben, ca. 3–4 Minuten. Zusammensetzung:
   - zuerst fällige Wiederholungen (überfällige und niedrige Fächer zuerst), bis ca. 50 %,
   - dann neue/wackelige Karten der **Fokus-Reihe**. Fokus-Reihe = die **zuletzt freigeschaltete** Reihe, die noch nicht Silber hat. Von den Eltern freigeschaltete Reihen (z. B. weil die Schule gerade die 7er macht) kommen damit sofort dran. Haben alle offenen Reihen Silber, gibt es keine Fokus-Reihe, nur Wiederholung und Mischung.
   - aufgefüllt mit sicheren Karten aus allen freigeschalteten Reihen.
   - Ziel-Trefferquote ca. 80 %: Nach 2 Fehlern in Folge kommt eine sichere Karte dazwischen.
   - Das ist die gewünschte **gemischte Abfrage**: Sobald mehrere Reihen offen sind, mischt das Tagestraining über alle.
2. **Reihe üben:** Das Kind tippt eine freigeschaltete Reihe an → 10 Karten dieser Reihe gemischt (beim ersten Mal Entdecker-Runde).
3. **Reihen-Übersicht** *(ergänzt am 15.11. auf Wunsch)*: Ein Tipp auf eine offene Insel zeigt zuerst die ganze Reihe zum Durchlesen (`1 · 2 = 2` … `10 · 2 = 20`), darüber die Zählreihe zum Mitsprechen. Kernaufgaben (1·, 2·, 5·, 10·) sind markiert, ein Punkt je Aufgabe zeigt den Lernstand. „Ergebnisse abdecken“ ersetzt die Ergebnisse durch Fragezeichen, die sich einzeln aufdecken lassen. Von hier startet „Reihe üben“.
4. **Quizfragen** *(ergänzt am 15.11. auf Wunsch: „als kleine Beimischung, nicht ständig“)*: Ab und zu kommt statt einer Rechenaufgabe eine Frage mit drei Antworten zum Antippen. Sie übt, Ergebnisse einer Reihe wiederzuerkennen.
   - **Wie oft:** Im Tagestraining 1–2 Fragen *zusätzlich* zu den 15 Aufgaben, nie als erste. Beim Üben einer einzelnen Reihe 1 Frage zu dieser Reihe. Keine in der Entdecker-Runde (auch nicht im Tagestraining am Entdecker-Tag) und keine in der Rekordjagd.
   - **Fragen,** nur zu entdeckten Reihen, nie zur 1er-Reihe (dort passt jede Zahl bis 10):
     - „Welche Zahl gehört in die 3er-Reihe?“ – eine Zahl ist ein Ergebnis der Reihe, zwei nicht.
     - ab 3 entdeckten Reihen (ohne 1er) auch: „In welche Reihe gehört die 35?“ – drei Reihen zur Auswahl, genau eine enthält die Zahl. Die anderen beiden teilen die Zahl gar nicht (also nie „100: 2er, 5er oder 10er“ – 100 ist gerade, das wäre eine Falle).
     - hat die Reihe Silber, auch: „Welche Zahl gehört **nicht** in die 4er-Reihe?“ – zwei Ergebnisse der Reihe, eine Zahl nicht.
   - Es passt immer genau eine Antwort. „In der Reihe“ heißt: eines der Ergebnisse 1·n … 10·n. Falsche Zahlen sind nie Vielfache der Reihe (also auch nicht 33 bei der 3er-Reihe) und liegen oft knapp daneben (26 oder 28 neben 27).
   - **Richtig** zählt fürs Tagesziel. **Falsch:** Die richtige Antwort leuchtet auf, darunter die Zählreihe mit den passenden Zahlen markiert; das Kind tippt die richtige Antwort an, dann geht es weiter.
   - Quizfragen verändern **keine** Fächer und Stufen und auch nicht die „richtig hintereinander“-Serie. Eine falsche Quizantwort zählt aber als Fehler der Runde (keine „fehlerfreie Runde“).
5. **Rekordjagd** (ab 3 freigeschalteten Reihen): 60 Sekunden, so viele richtige Aufgaben wie möglich aus allen freigeschalteten Reihen. Nur gegen den **eigenen** Rekord. Freiwillig; der einzige Modus mit sichtbarer Uhr. Zählt auch fürs Lernmodell (Fächer werden aktualisiert).

## 7. Motivation

### 7.1 Sichtbarer Weg
Der Startbildschirm zeigt eine **Reise-Karte mit 10 Stationen** (eine pro Reihe, in Freischalt-Reihenfolge). Freigeschaltete Stationen zeigen ihre Stufe (Bronze/Silber/Gold/Kristall), gesperrte sind angedeutet sichtbar, sodass das Kind sieht, was noch kommt. Die genaue Bildwelt (Inseln, Planeten, Wanderweg …) ist Sache des Bauenden, mit einer Vorgabe: eine durchgehende, wiedererkennbare Welt statt zusammengewürfelter Bilder.

### 7.2 Sticker **[Vorgabe: Sticker; Vorschlag: Ausgestaltung]**
Ein **Stickeralbum** mit Seiten nach Themen. Rund 80 Sticker:
- **Reihen-Sticker (40):** Jede Reihe hat ein eigenes Tier/Maskottchen; je Stufe ein Sticker (Bronze, Silber, Gold, Meister). Meister-Sticker sind **Glitzer-Sticker** (Holo-Schimmer).
- **Tages-Sticker (~30):** Wer an einem Tag das Tagesziel erreicht (siehe 7.3), bekommt einen zufälligen, noch nicht gesammelten Sticker aus diesem Pool. Höchstens einer pro Tag; wurde die App vorher geschlossen, wird er beim nächsten Start nachgereicht. Sind alle gesammelt, zählt nur der Stempel.
- **Besondere Sticker (~10):** z. B. erste Runde, erste fehlerfreie Runde, 10 / 25 richtig in Folge, 5 / 15 / 30 Übungstage, eine „Wackel-Aufgabe“ (≥ 3 Fehler) bis Fach 4 gebracht, neuer Rekord, 10 Quizfragen richtig („Zahlen-Detektiv“), alle Reihen freigeschaltet, alle Reihen Meister.
- Sticker werden **nur durch echtes Lernen** verdient, nie weggenommen.
- Darstellung: Emoji im Sticker-Look (weißer Rand, Schatten, leicht gedreht) – bunt, kostenlos, keine Bilddateien. Neue Sticker kommen mit einer kleinen „Auspack“-Animation.

### 7.3 Dranbleiben ohne Druck
- **Tagesziel:** 30 richtig gelöste Aufgaben am Tag (etwa zwei Runden à 15), egal in welchem Modus; falsche Antworten zählen nicht. Im Eltern-Bereich einstellbar (20/30/40/50). Ein erreichter Tag bleibt erreicht, auch wenn das Ziel später erhöht wird. Startseite und Ergebnis zeigen den Zähler („12 von 30 richtig“); solange das Ziel fehlt, ist „Noch eine Runde“ der Hauptknopf. *(Geändert am 15.11.: anfangs zählte schon ein Tagestraining – am Entdecker-Tag waren das nur 10 Aufgaben mit Hilfe.)*
- **Stempelkarte der Woche:** Jeder Übungstag bekommt einen Stempel. 4 Stempel in einer Woche (Mo–So) → besonderer Wochen-Sticker. Ein verpasster Tag kostet nichts; es gibt keine Serie, die „reißt“.
- Begrüßung mit dem Namen des Kindes (einmal eingegeben) und einem Hinweis, was heute ansteht („3 Aufgaben wollen wiederholt werden“).
- Feiern: Konfetti bei neuer Stufe/neuer Reihe, kurzer Jubel beim Sticker.
- Töne: freundliche, kurze Klänge (im Browser erzeugt, keine Dateien); leicht stummschaltbar.

### 7.4 Fortschritt schützen
- Speichern nach **jeder** Antwort.
- Beim Start dauerhaften Speicher beim Browser anfordern (`navigator.storage.persist()`).
- **Sicherungscode:** Im Eltern-Bereich lässt sich der gesamte Stand als Text-Code kopieren/teilen (z. B. per Nachricht an sich selbst) und wieder einspielen. Die App erinnert die Eltern alle 2 Wochen daran (kleiner Hinweis im Eltern-Bereich, nicht beim Kind).
- Auf dem iPhone muss die App **zum Startbildschirm hinzugefügt** werden, damit Safari die Daten nicht nach Tagen ohne Nutzung löscht. Die App auf dem Startbildschirm hat dort einen **eigenen Speicher**, getrennt von Safari. Darum zeigt schon der Begrüßungsbildschirm in Safari die Anleitung; wurde bereits im Browser geübt, weist der Hinweis auf Sicherungscode erstellen → in der App einspielen hin.

## 8. Eltern-Bereich **[Vorschlag]**
Erreichbar über ein kleines Symbol, geschützt durch eine Rechenaufgabe außerhalb des kleinen Einmaleins (z. B. 17·4), damit das Kind nicht zufällig hineinkommt.

Inhalt:
- Überblick: Stufe je Reihe, Übungstage, Anzahl Aufgaben.
- „Hängt noch“: die Karten mit den meisten Fehlern / niedrigsten Fächern.
- Reihen von Hand freischalten. Eine so geöffnete Reihe behält ihren Platz auf der Reise-Karte und wird Fokus-Reihe (6.1). Die automatische Freischaltung nimmt immer die nächste noch gesperrte Reihe in der Reihenfolge aus 5.4 und überspringt bereits offene. Ihre Karten starten normal in Fach 0 (inkl. Entdecker-Runde).
- Sicherungscode erzeugen / einspielen.
- Name des Kindes ändern, Töne an/aus, alles zurücksetzen (mit Rückfrage).

## 9. Bildschirme (grob)

```
┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
│ Hallo Mia!   ⚙ 📒     │   │ ●●●●●●○○○○○○○○○  6/15 │   │       Stickeralbum    │
│                       │   │                       │   │  Tiere   Weltall  …   │
│   [ Tagestraining ]   │   │        7 · 6          │   │ ┌──┐┌──┐┌──┐┌──┐      │
│   3 Wiederholungen    │   │       ┌─────┐         │   │ │🦊││🐢││ ?││ ?│      │
│                       │   │       │ 4_  │         │   │ └──┘└──┘└──┘└──┘      │
│  Reise-Karte:         │   │       └─────┘         │   │ ┌──┐┌──┐┌──┐┌──┐      │
│  (2)🥈─(10)🥉─(5)·─…  │   │  [1] [2] [3]          │   │ │ ?││🦉││ ?││ ?│      │
│                       │   │  [4] [5] [6]          │   │ └──┘└──┘└──┘└──┘      │
│  Stempel: ✓✓·✓···     │   │  [7] [8] [9]          │   │       24 / 80         │
│  [Rekordjagd 🔒]      │   │  [⌫] [0] [OK]         │   │                       │
└───────────────────────┘   └───────────────────────┘   └───────────────────────┘
      Start                       Aufgabe                      Album
```

- **Eingabe:** eigenes großes Zahlenfeld (keine Handy-Tastatur), Bestätigen mit OK. Kein automatisches Abschicken (würde Lösungen verraten bzw. Raten belohnen).
- Große Tippflächen (≥ 48 px), große Schrift, kein Ton- oder Farbsignal als einzige Rückmeldung.
- Nach einer Runde: Zusammenfassung (richtig, neue Stufen, neue Sticker), dann zurück zum Start.

## 10. Technik **[Vorschlag]**
- Statische Website ohne Server und ohne Build-Schritt: `index.html` + JavaScript/CSS, `manifest.webmanifest`, Service Worker für Offline-Betrieb, App-Symbole (PNG, inkl. Apple-Touch-Icon).
- Kein Framework nötig; Code so gegliedert, dass Lernmodell (Fächer, Fälligkeit, Stufen, Rundenzusammenstellung) getrennt von der Oberfläche liegt und automatisch getestet werden kann.
- Daten in `localStorage` unter einem versionierten Schlüssel; Datenformat mit Versionsnummer, damit spätere Updates alte Stände übernehmen können.
- Schriften offline verfügbar (selbst mitgeliefert oder Systemschrift).
- Projektordner: `C:\claude\einmaleins\`.
- Beim Aktualisieren der App darf der Fortschritt nie verloren gehen (Service-Worker-Update lädt nur Programmdateien neu).
- **Umfang:** Alles aus diesem Entwurf kommt in die erste Version. Gebaut und getestet wird zuerst das Lernmodell (5 und 6), dann die Oberfläche. Ändert sich das Lernmodell später, übernimmt eine Datenformat-Migration den Stand.

## 11. Was dem Bauenden überlassen ist
- Bildwelt, Farben, Schrift, Maskottchen-Auswahl je Reihe, Sticker-Motive und Themenseiten – innerhalb der Vorgaben aus 2 und 7 (fröhlich, nicht babyhaft, eine durchgehende Welt).
- Animationen, Klänge, genaue Texte.
- Genaue Gewichtung der Rundenzusammenstellung im Rahmen von 6.1.
- Format des Sicherungscodes.

## 12. Offen, wird am Ende geklärt
- **Wo die App liegt** (z. B. GitHub Pages oder Netlify; braucht https). Die Dateien funktionieren überall gleich; das entscheidet nur, wie der Link aufs Handy kommt.
