import { hashString, mulberry32 } from './pixel';
import { dayPhase, smoothstep } from './atmosphere';

type Ctx = CanvasRenderingContext2D;
type Paint = (x: number, y: number, w: number, h: number, color: string) => void;
const brush = (ctx: Ctx): Paint => (x, y, w, h, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
const wrap = (v: number, n: number) => ((v % n) + n) % n;

// All coordinates are art pixels. Prepaint architecture in pairs using the
// same seed: changing the light should never change a window or rooftop.
function streetscape(w: number, h: number, seed: number, near: boolean, night: boolean) {
  const layer = document.createElement('canvas');
  layer.width = w + 20; layer.height = h;
  const ctx = layer.getContext('2d')!;
  const rect = brush(ctx), rnd = mulberry32(seed);
  const road = Math.round(h * .85);
  const walls = night ? ['#34425a', '#363956', '#2d4051', '#434059'] :
    ['#e9bc9e', '#b1c9b7', '#e1caa0', '#c9b7c6'];
  for (let x = -12; x < w + 20;) {
    const bw = Math.floor(near ? 18 + rnd() * 19 : 8 + rnd() * 14);
    const bh = Math.floor(h * (near ? .11 + rnd() * .21 : .21 + rnd() * .27));
    const top = road - bh;
    const style = Math.floor(rnd() * 4);
    if (!near) {
      const color = night ? ['#232f49', '#293750'][style % 2] : ['#a9c6cb', '#b8d2cf'][style % 2];
      rect(x, top, bw, bh, color);
      rect(x + 2, top - 3, bw - 6, 3, color);
      if (style === 1) rect(x + bw / 2, top - 8, 1, 7, color);
      for (let y = top + 4; y < road; y += 6) rect(x + 3, y, bw - 6, 1, night ? '#354159' : '#c4dad6');
    } else {
      const trim = night ? '#232d42' : '#878b88';
      rect(x, top, bw, bh, walls[style]);
      rect(x + bw - 3, top, 3, bh, night ? '#273148' : '#aaa398');
      rect(x - 1, top, bw + 2, 2, trim);
      rect(x + 2, top - 2, bw - 4, 2, night ? '#596077' : '#f3d9bd');
      if (style % 2 === 0) { // stepped water tank and its stilts
        rect(x + 4, top - 6, 1, 5, trim); rect(x + 11, top - 6, 1, 5, trim);
        rect(x + 3, top - 12, 10, 7, night ? '#475064' : '#a79b88');
        rect(x + 5, top - 14, 6, 2, trim);
        rect(x + 3, top - 9, 10, 1, trim);
      } else rect(x + 5, top - 5, 6, 4, trim);
      for (let y = top + 5; y < road - 12; y += 8) {
        for (let win = x + 3; win < x + bw - 5; win += 7) {
          const lit = rnd() > .46;
          rect(win, y, 4, 5, night ? (lit ? '#e2ba86' : '#25354c') : '#657f86');
          rect(win, y, 1, 3, night ? (lit ? '#ffe0a4' : '#364762') : '#afcbca');
          rect(win - 1, y + 5, 6, 1, trim);
        }
      }
      // Glazed shopfronts under striped canvas awnings.
      rect(x + 2, road - 9, bw - 5, 9, trim);
      for (let i = 3; i < bw - 6; i += 7)
        rect(x + i, road - 7, 5, 6, night ? '#aa906f' : '#a6c9c6');
      rect(x, road - 12, bw - 2, 3, night ? '#766b70' : '#faf0d2');
      for (let i = 0; i < bw - 4; i += 6)
        rect(x + i, road - 12, 3, 4, night ? '#5a555e' : ['#b27667', '#769b90'][style % 2]);
    }
    x += bw + (near ? 3 : 1);
  }
  if (near) {
    rect(0, road, w + 20, h - road, night ? '#202838' : '#879095');
    rect(0, road, w + 20, 3, night ? '#656173' : '#ded0b3');
    rect(0, road + 3, w + 20, 1, night ? '#373c50' : '#aba9a2');
    for (let x = 0; x < w + 20; x += 26) rect(x, road + (h-road)*.59, 11, 1, night ? '#5d5c69' : '#e8d8b7');
    for (let x = 17; x < w; x += 61) {
      rect(x, road - 13, 1, 13, night ? '#242c3e' : '#6f7e7d');
      rect(x - 4, road - 14, 5, 1, night ? '#687081' : '#768483');
      rect(x - 4, road - 13, 3, 1, night ? '#ffe1a5' : '#f7e8ba');
    }
  }
  return layer;
}

export function createCityscape(ctx: Ctx, w: number, h: number, key: string) {
  const seed = hashString(key), rnd = mulberry32(seed), rect = brush(ctx);
  const layers = [false, true].map((near, i) =>
    [false, true].map(night => streetscape(w, h, seed + i, near, night)));
  const stars = Array.from({ length: Math.min(160, Math.ceil(w * h / 330)) }, () =>
    ({ x: rnd() * w, y: rnd() * h * .79, phase: rnd() * 6.28, bright: rnd() > .89 }));
  const sky = (colors: string[]) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
    return g;
  };
  const day = sky(dayPhase(new Date().getHours()) === 'golden hour'
    ? ['#abc9df', '#f1d6bf', '#ffe4b8'] : ['#8ec6db', '#d1e8e3', '#f8e6bf']);
  const dusk = sky(['#8a8db6', '#eca693', '#ffce91']);
  const night = sky(['#10162e', '#253451', '#52516a']);
  const disc = (x: number, y: number, r: number, color: string) => {
    for (let row = -r; row <= r; row++) {
      const span = Math.round(Math.sqrt(r * r - row * row));
      rect(x - span, y + row, span * 2 + 1, 1, color);
    }
  };
  return (t: number, mix: number, px: number, py: number) => {
    const wash = (color: CanvasGradient, alpha: number) => {
      ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
    };
    wash(day, 1);
    if (mix > 0 && mix < 1) wash(dusk, Math.sin(mix * Math.PI));
    if (mix > 0) wash(night, smoothstep(mix));
    if (mix > 0) {
      for (const s of stars) {
        ctx.globalAlpha = mix * (.67 + .32 * Math.sin(t * .85 + s.phase));
        const x = s.x + px, y = s.y + py;
        rect(x, y, 1, 1, '#f5eedc');
        if (s.bright) {
          ctx.globalAlpha *= .52;
          rect(x - 1, y, 3, 1, '#d5dcff'); rect(x, y - 1, 1, 3, '#d5dcff');
        }
      }
      const pass = wrap(t + 25, 36);
      if (pass < 8) {
        const x = (w + 18) * pass / 8 - 12, y = h * .32 - pass + Math.sin(pass) * 2;
        ctx.globalAlpha = mix;
        rect(x - 4, y + 2, 6, 1, '#dc9a8e'); rect(x, y, 8, 3, '#acbad5');
        rect(x + 3, y - 2, 3, 2, '#e1e7f0'); rect(x + 2, y + 3, 3, 1, '#6a779c');
      }
      ctx.globalAlpha = mix;
      const mx = w * (.68 + .07 * Math.sin(t * .018)) + px;
      const my = h * (.21 + .7 * (1 - mix) + .028 * Math.sin(t * .027)) + py;
      const mr = Math.max(5, Math.round(h * .058));
      disc(mx, my, mr, '#ebe9dc');
      rect(mx - mr * .57, my, mr * .5, 2, '#c7c9ce');
      rect(mx + 1, my - mr * .55, 3, 2, '#d1d2d0');
    }
    if (mix < 1) {
      ctx.globalAlpha = 1 - mix * mix;
      disc(w * (.78 - .12 * mix) + px, h * (.21 + .74 * mix) + py, Math.max(5, Math.round(h * .067)), '#fff0b6');
      ctx.globalAlpha = 1 - mix;
      for (let i = 0; i < 4; i++) {
        const x = wrap(w * (i * .32 + .1) + t * (.7 + i * .22) + px * 1.5, w + 43) - 40;
        const y = h * (.1 + (i % 3) * .092) + py;
        rect(x, y + 4, 36, 3, '#f7f4e6'); rect(x + 5, y, 24, 5, '#f7f4e6');
        rect(x + 11, y - 3, 10, 4, '#fffbed'); rect(x + 4, y + 7, 28, 1, '#cce0de');
      }
    }
    layers.forEach(([light, dark], i) => {
      const x = -10 + Math.round(px * (i ? 7 : 3));
      const y = i ? 0 : Math.round(py * 2);
      ctx.globalAlpha = 1;
      if (mix < 1) ctx.drawImage(light, x, y);
      if (mix > 0) { ctx.globalAlpha = mix; ctx.drawImage(dark, x, y); }
    });
    ctx.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {
      const dir = i === 1 ? -1 : 1;
      const x = wrap(w * (.18 + i * .31) + dir * t * (dir > 0 ? 6 : 5) + px * 7, w + 24) - 12;
      const y = Math.round(h * (dir === 1 ? .91 : .974));
      const paint = ['#ce7868', '#66999e', '#d9ac69'][i];
      rect(x, y - 4, 15, 4, paint); rect(x + 3, y - 7, 8, 3, paint);
      rect(x + 4, y - 6, 3, 2, '#d5e6df'); rect(x + 8, y - 6, 2, 2, '#8ba8ac');
      rect(x + 2, y - 1, 3, 3, '#38424c'); rect(x + 10, y - 1, 3, 3, '#38424c');
      rect(x + (dir > 0 ? 14 : 0), y - 3, 1, 1, '#ffedaf');
    }
    // Two narrow bevels displace the actual background pixels, not the DOM.
    for (const x of [2, w - 4]) {
      ctx.drawImage(ctx.canvas, x + 1, 0, 2, h, x, 0, 2, h);
    }
    rect(0, 0, w, 1, 'rgba(255,255,255,.2)');
  };
}
