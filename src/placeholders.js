// Procedural sunset placeholder images, painted on 2D canvas.
// Swapped out for real photos once entries in data.js get a `src`.

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTES = [
  { sky: ['#2b1348', '#7a2a5e', '#d94f63', '#ff9a53', '#ffd9a0'], sun: '#ffe9c2', land: '#160a20' },
  { sky: ['#0f1533', '#3d2a63', '#b04a72', '#ff7a45', '#ffc78a'], sun: '#fff1cf', land: '#0d0a1c' },
  { sky: ['#241033', '#5e2451', '#c14a5e', '#f0803f', '#ffdba6'], sun: '#ffefc9', land: '#1a0c18' },
  { sky: ['#101c3a', '#2f3a6b', '#946099', '#e78d6a', '#ffe0b3'], sun: '#fff5da', land: '#101322' },
  { sky: ['#33101f', '#7c2440', '#d4534f', '#ff8f4d', '#ffd093'], sun: '#ffeec6', land: '#190812' },
  { sky: ['#1a0f2e', '#4b2a5e', '#a34a7c', '#e2566e', '#ff9a6b'], sun: '#ffe3c4', land: '#120a1a' },
];

function drawSky(ctx, w, h, pal, horizon) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const stops = pal.sky;
  g.addColorStop(0, stops[0]);
  g.addColorStop(horizon * 0.45, stops[1]);
  g.addColorStop(horizon * 0.78, stops[2]);
  g.addColorStop(horizon * 0.95, stops[3]);
  g.addColorStop(Math.min(1, horizon * 1.02), stops[4]);
  g.addColorStop(1, stops[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawSun(ctx, w, h, pal, rand, horizon) {
  const sx = w * (0.3 + rand() * 0.4);
  const sy = h * horizon - h * (0.02 + rand() * 0.1);
  const r = Math.min(w, h) * (0.09 + rand() * 0.07);

  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 5);
  glow.addColorStop(0, 'rgba(255, 220, 160, 0.85)');
  glow.addColorStop(0.35, 'rgba(255, 160, 90, 0.35)');
  glow.addColorStop(1, 'rgba(255, 140, 80, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = pal.sun;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();
  return { sx, sy, r };
}

function drawClouds(ctx, w, h, rand, horizon) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const bands = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < bands; i++) {
    const cy = h * horizon * (0.25 + rand() * 0.6);
    const cw = w * (0.3 + rand() * 0.55);
    const ch = h * (0.01 + rand() * 0.02);
    const cx = w * rand();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cw / 2);
    g.addColorStop(0, `rgba(255, 190, 150, ${0.14 + rand() * 0.18})`);
    g.addColorStop(1, 'rgba(255, 190, 150, 0)');
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ch / (cw / 2));
    ctx.beginPath();
    ctx.arc(0, 0, cw / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawSea(ctx, w, h, pal, rand, horizon, sun) {
  const top = h * horizon;
  const g = ctx.createLinearGradient(0, top, 0, h);
  g.addColorStop(0, pal.sky[3]);
  g.addColorStop(0.12, pal.sky[2]);
  g.addColorStop(1, pal.land);
  ctx.fillStyle = g;
  ctx.fillRect(0, top, w, h - top);

  // sun reflection column
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 46; i++) {
    const t = i / 46;
    const y = top + t * (h - top);
    const width = sun.r * (0.7 + t * 1.6) * (0.4 + rand() * 0.9);
    const alpha = (1 - t) * 0.35 * (0.4 + rand() * 0.6);
    ctx.fillStyle = `rgba(255, 200, 130, ${alpha})`;
    ctx.fillRect(sun.sx - width / 2, y, width, Math.max(1.5, h * 0.004));
  }
  ctx.restore();
}

function drawMountains(ctx, w, h, pal, rand, horizon) {
  const layers = 3;
  for (let l = 0; l < layers; l++) {
    const base = h * horizon + (l * h * 0.07);
    const amp = h * (0.1 - l * 0.02);
    ctx.fillStyle = l === layers - 1
      ? pal.land
      : `rgba(${18 + l * 6}, ${9 + l * 4}, ${26 + l * 6}, ${0.75 + l * 0.12})`;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, base);
    const peaks = 4 + Math.floor(rand() * 4);
    for (let i = 0; i <= peaks; i++) {
      const px = (w / peaks) * i;
      const py = base - Math.abs(Math.sin(i * 2.7 + l + rand() * 2)) * amp - rand() * amp * 0.5;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(w, base);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
}

function drawDunes(ctx, w, h, pal, rand, horizon) {
  for (let l = 0; l < 3; l++) {
    const base = h * (horizon + 0.04 + l * 0.1);
    ctx.fillStyle = l === 2 ? pal.land : `rgba(30, 14, 28, ${0.55 + l * 0.2})`;
    ctx.beginPath();
    ctx.moveTo(0, h);
    const phase = rand() * Math.PI * 2;
    for (let x = 0; x <= w; x += w / 60) {
      const y = base + Math.sin((x / w) * Math.PI * (1.4 + l * 0.7) + phase) * h * 0.05;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBirds(ctx, w, h, rand) {
  const n = 2 + Math.floor(rand() * 4);
  ctx.strokeStyle = 'rgba(20, 10, 20, 0.8)';
  ctx.lineWidth = Math.max(1.2, w * 0.0016);
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const bx = w * (0.15 + rand() * 0.7);
    const by = h * (0.12 + rand() * 0.3);
    const s = w * (0.008 + rand() * 0.008);
    ctx.beginPath();
    ctx.arc(bx - s, by, s, -Math.PI * 0.85, -Math.PI * 0.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx + s, by, s, -Math.PI * 0.75, -Math.PI * 0.15);
    ctx.stroke();
  }
}

function drawGrain(ctx, w, h, rand) {
  const size = 128;
  const noise = document.createElement('canvas');
  noise.width = size; noise.height = size;
  const nctx = noise.getContext('2d');
  const img = nctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rand() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 24;
  }
  nctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  const pattern = ctx.createPattern(noise, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function createSunsetCanvas({ orientation = 'landscape', seed = 1, variant = 'sea' }) {
  const landscape = orientation === 'landscape';
  const w = landscape ? 1408 : 960;
  const h = landscape ? 880 : 1408;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const rand = mulberry32(seed * 7919 + 13);
  const pal = PALETTES[seed % PALETTES.length];
  const horizon = 0.58 + rand() * 0.16;

  drawSky(ctx, w, h, pal, horizon);
  drawClouds(ctx, w, h, rand, horizon);
  const sun = drawSun(ctx, w, h, pal, rand, horizon);

  if (variant === 'sea') drawSea(ctx, w, h, pal, rand, horizon, sun);
  else if (variant === 'mountains') drawMountains(ctx, w, h, pal, rand, horizon);
  else drawDunes(ctx, w, h, pal, rand, horizon);

  drawBirds(ctx, w, h, rand);
  drawGrain(ctx, w, h, rand);

  // soft vignette
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(10, 4, 14, 0.42)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);

  return canvas;
}
