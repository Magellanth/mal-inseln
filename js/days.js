// Tage als fortlaufende Zahlen (lokales Kalenderdatum), damit Fälligkeiten einfache Ganzzahl-Vergleiche sind.

export function dayNum(date = new Date()) {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

// Montag der Woche, in der `day` liegt. Tag 0 (1.1.1970) war ein Donnerstag.
export function weekStart(day) {
  return day - ((day + 3) % 7);
}

export function weekday(day) {
  return (day + 3) % 7; // 0 = Montag … 6 = Sonntag
}
