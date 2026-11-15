# Mal-Inseln

Lern-App fürs kleine Einmaleins (1er- bis 10er-Reihe) für Kinder der 3. Klasse. Läuft im Handy-Browser, lässt sich zum Startbildschirm hinzufügen und funktioniert danach offline. Der Fortschritt bleibt nur auf dem Gerät; über den Eltern-Bereich lässt er sich als Sicherungscode aufheben.

## Entwickeln

```bash
npm test          # Lernmodell, Runden, Rechenwege, Sticker, Speicher
npm run serve     # http://localhost:5173
npm run icons     # App-Symbole neu erzeugen
```

Lokal ist der Service Worker aus, damit Änderungen sofort sichtbar sind. Mit `http://localhost:5173/?sw` lässt er sich testen.

## Veröffentlichen

Die App ist eine statische Seite und läuft auf jedem Webspace mit https (z. B. GitHub Pages). **Bei jedem Update in `sw.js` die `VERSION` erhöhen**, sonst behalten installierte Geräte die alte Fassung. Neue Dateien in `ASSETS` eintragen (`npm test` prüft das).

## Aufbau

- `js/model.js` – Karteikasten (Fächer 0–5), Stufen, Freischaltung
- `js/rounds.js` – Tagestraining, Reihe üben, Rekordjagd, Wiedervorlage falscher Aufgaben
- `js/hints.js` – Rechenwege bei Fehlern
- `js/stickers.js` – Sticker-Katalog und Vergabe
- `js/storage.js` – Speichern, Migration, Sicherungscode
- `js/ui/` – Bildschirme
- `docs/` – Entwurf und Umsetzungsplan
