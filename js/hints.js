// Rechenwege bei Fehlern: von einer Kernaufgabe (1·, 2·, 5·, 10·) ableiten + passendes Punktefeld.
// Punktefeld: `rows` gefüllte Reihen mit je `cols` Punkten; die ersten `accentRows` farbig (der Teil der Kernaufgabe),
// danach `ghostRows` hohle Reihen (der Teil, der abgezogen wird).

const M = '·';
const MINUS = '−';

function eq(a, b) {
  return `${a} ${M} ${b} = ${a * b}`;
}

export function hintFor(k, n) {
  const result = k * n;
  const dots = { rows: k, cols: n, accentRows: k, ghostRows: 0 };
  const last = eq(k, n);
  let tip;
  let lines;

  if (k === 1 || n === 1) {
    tip = 'Mal 1 bleibt die Zahl gleich.';
    lines = [last];
  } else if (k === 10) {
    tip = `${n} Zehner sind ${result}.`;
    lines = [last];
  } else if (n === 10) {
    tip = `${k} Zehner sind ${result}.`;
    lines = [last];
  } else if (k === 2) {
    tip = 'Verdoppeln!';
    lines = [`${n} + ${n} = ${result}`, last];
    dots.accentRows = 1;
  } else if (n === 2) {
    tip = 'Verdoppeln!';
    lines = [`${k} + ${k} = ${result}`, last];
  } else if (n === 5 || k === 5) {
    const other = n === 5 ? k : n;
    tip = `Die Hälfte von 10 ${M} ${other}.`;
    lines = [eq(10, other), `Die Hälfte von ${10 * other} ist ${result}.`, last];
  } else if (k === 3) {
    tip = `2 ${M} ${n} und noch ein ${n}.`;
    lines = [eq(2, n), `+ ${eq(1, n)}`, last];
    dots.accentRows = 2;
  } else if (k === 4) {
    tip = `Das Doppelte von 2 ${M} ${n}.`;
    lines = [eq(2, n), `${2 * n} + ${2 * n} = ${result}`, last];
    dots.accentRows = 2;
  } else if (k === 6 || k === 7) {
    tip = `Erst 5 ${M} ${n}, dann den Rest.`;
    lines = [eq(5, n), `+ ${eq(k - 5, n)}`, last];
    dots.accentRows = 5;
  } else if (k === 8 || k === 9) {
    tip = `Von 10 ${M} ${n} aus rückwärts.`;
    lines = [eq(10, n), `${MINUS} ${eq(10 - k, n)}`, last];
    dots.ghostRows = 10 - k;
  }

  return { tip, lines, dots, result };
}
