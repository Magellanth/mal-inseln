// Konfetti für große Momente (neue Stufe, neue Insel, Rekord). Bei „Bewegung reduzieren“ aus.

const COLORS = ['#ffc83d', '#23a058', '#4aa6e8', '#e97c12', '#a865d6', '#ffffff'];

export function confetti({ count = 110 } = {}) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  document.body.append(canvas);
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const hgt = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = hgt * dpr;
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  const parts = Array.from({ length: count }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.3,
    y: hgt * 0.35,
    vx: (Math.random() - 0.5) * 9,
    vy: -6 - Math.random() * 8,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.4,
    s: 6 + Math.random() * 7,
    c: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
  const start = performance.now();
  const frame = (now) => {
    const t = now - start;
    g.clearRect(0, 0, w, hgt);
    for (const p of parts) {
      p.vy += 0.28;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.fillStyle = p.c;
      g.strokeStyle = '#1c2452';
      g.lineWidth = 1.5;
      g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      g.strokeRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      g.restore();
    }
    if (t < 2600) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
