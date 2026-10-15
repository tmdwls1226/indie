// Player sprites (Leon / Elia / Serin), drawn procedurally on a 96x80 canvas, feet resting on y = 75, facing right.
// The canvas is wider than tall so lunges and staff swings never touch the edge.
import { Img, hex, rect, ellipse, ring, line, poly, part, outline, tint } from './lib.mjs';

export const W = 96, H = 80, CX = 34, FOOT = 75;
const pal = (base, light, dark) => ({ base: hex(base), light: hex(light), dark: hex(dark) });

// ---------- shared pose vocabulary ----------
export const POSE = {
  dx: 0, dy: 0, sink: 0, lean: 0, headDy: 0, headDx: 0,
  legL: { x: -3, lift: 0 }, legR: { x: 3, lift: 0 },
  handB: [-1, 9], handF: [1, 9],          // hand offsets from the shoulders
  weapon: { ang: 35, len: 21, glow: 0 },  // degrees (0 = right, -90 = up); glow 0..1 for magic charge
  cape: 0, hem: 0, eyes: 'open', mouth: 0, flash: 0, sparks: 0
};
export const pose = (o = {}) => ({ ...POSE, ...o, legL: { ...POSE.legL, ...o.legL }, legR: { ...POSE.legR, ...o.legR }, weapon: { ...POSE.weapon, ...o.weapon } });

const SKIN = pal('#f2cfae', '#ffe6cc', '#d4a481');
const polar = (x, y, ang, len) => [x + Math.cos((ang * Math.PI) / 180) * len, y + Math.sin((ang * Math.PI) / 180) * len];

function face(img, cx, cy, p, eyeCol) {
  part(img, SKIN, (L, c) => { ellipse(L, cx, cy, 6.2, 5.6, c); rect(L, cx - 3, cy + 4, 7, 3, c); });
  const ey = cy + 1, dark = hex('#3a2a2a');
  if (p.eyes === 'open') for (const ex of [cx - 3, cx + 2]) { rect(img, ex, ey, 2, 3, eyeCol); img.set(ex, ey, hex('#ffffff')); }
  else if (p.eyes === 'closed') for (const ex of [cx - 3, cx + 2]) rect(img, ex, ey + 1, 3, 1, dark);
  else for (const ex of [cx - 3, cx + 2]) { img.set(ex, ey, dark); img.set(ex + 2, ey, dark); img.set(ex + 1, ey + 1, dark); img.set(ex, ey + 2, dark); img.set(ex + 2, ey + 2, dark); }
  if (p.mouth) rect(img, cx - 1, cy + 4, 3, 2, hex('#7a3a3a')); else rect(img, cx - 1, cy + 4, 2, 1, hex('#b0705a'));
}
function pants(img, X, B, p, pantsPal, bootsPal) {
  for (const leg of [p.legL, p.legR]) {
    const lx = X + leg.x, top = B + p.sink - 13, bot = B - leg.lift;
    part(img, pantsPal, (L, c) => rect(L, lx - 2, top, 5, Math.max(1, bot - top - 3), c));
    part(img, bootsPal, (L, c) => rect(L, lx - 2, bot - 4, 6, 4, c));
  }
}
function arm(img, from, to, sleeve, hand, w = 3) {
  part(img, sleeve, (L, c) => line(L, from[0], from[1], to[0], to[1], c, w));
  part(img, hand, (L, c) => rect(L, to[0] - 1, to[1] - 1, 3, 3, c));
}
function sparkles(img, cx, cy, n, col) {
  const spots = [[-6, -5], [5, -8], [-3, 6], [8, 2], [0, -11], [-9, 1]];
  for (let i = 0; i < Math.min(n, spots.length); i++) { const [sx, sy] = spots[i]; img.set(cx + sx, cy + sy, col); img.set(cx + sx - 1, cy + sy, col); img.set(cx + sx + 1, cy + sy, col); img.set(cx + sx, cy + sy - 1, col); img.set(cx + sx, cy + sy + 1, col); }
}
const finish = (img, p, lineFactor = 0.25) => { outline(img, lineFactor); return p.flash ? tint(img, hex('#ffffff'), p.flash) : img; };

// ---------- LEON (swordsman) ----------
const LEON = {
  hair: pal('#c9d3ea', '#f1f5ff', '#8794b8'), cloak: pal('#2a4bb4', '#4d78e6', '#182a74'), steel: pal('#46587f', '#7089b8', '#28345a'),
  pants: pal('#262e4a', '#3a4668', '#161b2e'), boots: pal('#4a3326', '#6b4a38', '#2a1c14'), gold: pal('#d9ab4a', '#ffd97a', '#8f6a22'),
  blade: pal('#dfe7f4', '#ffffff', '#8fa0bf'), aura: pal('#7fd4ff', '#e4f8ff', '#2f86d4')
};
export function drawLeon(p) {
  const img = new Img(W, H), X = CX + p.dx, B = FOOT + p.dy, Bu = B + p.sink, up = X + p.lean;
  part(img, LEON.cloak, (L, c) => poly(L, [[up - 7, Bu - 27], [up + 7, Bu - 27], [up + 10 + p.cape, Bu - 8], [up - 9 + p.cape, Bu - 7]], c));
  const sB = [up - 8, Bu - 25], sF = [up + 8, Bu - 25];
  arm(img, sB, [sB[0] + p.handB[0], sB[1] + p.handB[1]], LEON.cloak, LEON.steel);
  pants(img, X, B, p, LEON.pants, LEON.boots);
  part(img, LEON.steel, (L, c) => rect(L, up - 6, Bu - 27, 13, 14, c));
  part(img, LEON.cloak, (L, c) => rect(L, up - 2, Bu - 25, 5, 11, c));
  part(img, LEON.gold, (L, c) => { rect(L, up - 6, Bu - 15, 13, 2, c); });
  part(img, LEON.gold, (L, c) => rect(L, up - 1, Bu - 24, 3, 2, c));
  part(img, LEON.steel, (L, c) => { ellipse(L, up - 8, Bu - 26, 3.4, 3, c); ellipse(L, up + 8, Bu - 26, 3.4, 3, c); });
  part(img, LEON.gold, (L, c) => { rect(L, up - 10, Bu - 24, 5, 1, c); rect(L, up + 6, Bu - 24, 5, 1, c); });
  const hx = up + 1 + p.headDx, hy = Bu - 35 + p.headDy;
  part(img, LEON.hair, (L, c) => {
    ellipse(L, hx, hy - 3, 8, 6.5, c);
    poly(L, [[hx - 8, hy - 2], [hx - 11, hy - 9], [hx - 5, hy - 6]], c); poly(L, [[hx - 3, hy - 8], [hx - 3, hy - 15], [hx + 2, hy - 8]], c);
    poly(L, [[hx + 3, hy - 8], [hx + 8, hy - 14], [hx + 8, hy - 5]], c); poly(L, [[hx + 6, hy - 3], [hx + 12, hy - 6], [hx + 8, hy + 1]], c); poly(L, [[hx - 8, hy + 1], [hx - 11, hy + 4], [hx - 7, hy + 3]], c);
  });
  face(img, hx, hy + 1, p, hex('#233a9a'));
  part(img, LEON.hair, (L, c) => { poly(L, [[hx - 6, hy - 3], [hx - 1, hy - 4], [hx - 4, hy]], c); poly(L, [[hx + 1, hy - 4], [hx + 7, hy - 3], [hx + 5, hy - 1]], c); });
  const hF = [sF[0] + p.handF[0], sF[1] + p.handF[1]], w = p.weapon;
  const tip = polar(hF[0], hF[1], w.ang, w.len), back = polar(hF[0], hF[1], w.ang + 180, 4);
  if (w.glow) part(img, LEON.aura, (L, c) => line(L, hF[0], hF[1], tip[0], tip[1], c, 5));
  part(img, LEON.blade, (L, c) => line(L, hF[0], hF[1], tip[0], tip[1], c, 3));
  const g1 = polar(hF[0], hF[1], w.ang + 90, 4), g2 = polar(hF[0], hF[1], w.ang - 90, 4);
  part(img, LEON.gold, (L, c) => { line(L, g1[0], g1[1], g2[0], g2[1], c, 1); line(L, hF[0], hF[1], back[0], back[1], c, 2); });
  arm(img, sF, hF, LEON.cloak, LEON.steel);
  if (p.sparks) sparkles(img, tip[0], tip[1], p.sparks, hex('#d8f4ff'));
  return finish(img, p);
}

// ---------- ELIA (mage) ----------
const ELIA = {
  hair: pal('#c8283c', '#ee5668', '#861626'), hat: pal('#3a2f7a', '#5b4cb5', '#22194f'), robe: pal('#a82238', '#d24a5e', '#5c101e'),
  trim: pal('#2b2f6e', '#4650a8', '#171a3e'), gold: pal('#d9ab4a', '#ffd97a', '#8f6a22'), boots: pal('#2c2235', '#463852', '#17101c'),
  wood: pal('#6b4528', '#94643c', '#3d2614'), orbFire: pal('#ff8a2a', '#ffe27a', '#b8340f'), orbArc: pal('#b05cff', '#efd2ff', '#5a22a8')
};
export function drawElia(p) {
  const img = new Img(W, H), X = CX + p.dx, B = FOOT + p.dy, Bu = B + p.sink, up = X + p.lean;
  const sB = [up - 7, Bu - 24], sF = [up + 7, Bu - 24];
  // long hair behind
  part(img, ELIA.hair, (L, c) => { ellipse(L, up + 1 + p.headDx, Bu - 33 + p.headDy, 9, 8, c); rect(L, up - 9 + p.headDx, Bu - 33 + p.headDy, 18, 14, c); });
  arm(img, sB, [sB[0] + p.handB[0], sB[1] + p.handB[1]], ELIA.robe, SKIN);
  // boots peeking under the skirt
  for (const leg of [p.legL, p.legR]) { const lx = X + leg.x, bot = B - leg.lift; part(img, ELIA.boots, (L, c) => rect(L, lx - 2, bot - 5, 5, 5, c)); }
  // robe: bodice + flared skirt
  part(img, ELIA.robe, (L, c) => { rect(L, up - 5, Bu - 26, 11, 12, c); poly(L, [[up - 6, Bu - 15], [up + 6, Bu - 15], [X + 10 + p.hem, B - 4], [X - 10 + p.hem, B - 4]], c); });
  part(img, ELIA.trim, (L, c) => { rect(L, up - 6, Bu - 16, 13, 2, c); poly(L, [[X - 10 + p.hem, B - 6], [X + 10 + p.hem, B - 6], [X + 10 + p.hem, B - 4], [X - 10 + p.hem, B - 4]], c); });
  part(img, ELIA.gold, (L, c) => { rect(L, up - 1, Bu - 25, 3, 2, c); rect(L, up - 1, Bu - 16, 3, 2, c); });
  part(img, ELIA.trim, (L, c) => { ellipse(L, up - 7, Bu - 24, 3, 2.6, c); ellipse(L, up + 7, Bu - 24, 3, 2.6, c); });
  // head, hat
  const hx = up + 1 + p.headDx, hy = Bu - 34 + p.headDy;
  face(img, hx, hy + 1, p, hex('#8a1fd0'));
  part(img, ELIA.hair, (L, c) => { poly(L, [[hx - 6, hy - 4], [hx + 7, hy - 4], [hx + 5, hy], [hx + 1, hy - 2], [hx - 3, hy + 1]], c); rect(L, hx - 9, hy - 2, 3, 12, c); rect(L, hx + 7, hy - 2, 3, 12, c); });
  part(img, ELIA.hat, (L, c) => { ellipse(L, hx, hy - 5, 11, 2.8, c); poly(L, [[hx - 6, hy - 6], [hx + 7, hy - 6], [hx + 4, hy - 14], [hx + 10, hy - 19], [hx - 1, hy - 15]], c); });
  part(img, ELIA.gold, (L, c) => rect(L, hx - 6, hy - 8, 13, 2, c));
  // staff with orb
  const hF = [sF[0] + p.handF[0], sF[1] + p.handF[1]], w = p.weapon;
  const top = polar(hF[0], hF[1], w.ang, w.len), bot = polar(hF[0], hF[1], w.ang + 180, 9);
  part(img, ELIA.wood, (L, c) => line(L, bot[0], bot[1], top[0], top[1], c, 2));
  const big = 3 + Math.round(w.glow * 2.2);
  if (w.glow) part(img, ELIA.orbFire, (L, c) => ellipse(L, top[0], top[1], big + 2, big + 2, c));
  part(img, w.glow > 0.7 ? ELIA.orbArc : ELIA.orbFire, (L, c) => ellipse(L, top[0], top[1], big, big, c));
  part(img, ELIA.gold, (L, c) => { rect(L, top[0] - 4, top[1] + big - 1, 9, 2, c); });
  arm(img, sF, hF, ELIA.robe, SKIN);
  if (p.sparks) sparkles(img, top[0], top[1], p.sparks, hex('#ffe9a8'));
  return finish(img, p, 0.22);
}

// ---------- SERIN (cleric) ----------
const SERIN = {
  hair: pal('#e6cd78', '#fff0b3', '#b4953a'), robe: pal('#e8e3d4', '#fffdf3', '#b0a68c'), trim: pal('#d9ab4a', '#ffd97a', '#8f6a22'),
  blue: pal('#3e78d8', '#8cc4ff', '#1d3f8a'), boots: pal('#8a7550', '#b39c70', '#4d3f26'), staff: pal('#d9ab4a', '#ffd97a', '#8f6a22'),
  gem: pal('#58e0d0', '#d4fff8', '#1b8a82'), halo: pal('#ffe27a', '#fffbd0', '#c9962a')
};
export function drawSerin(p) {
  const img = new Img(W, H), X = CX + p.dx, B = FOOT + p.dy, Bu = B + p.sink, up = X + p.lean;
  const sB = [up - 7, Bu - 24], sF = [up + 7, Bu - 24];
  part(img, SERIN.hair, (L, c) => { ellipse(L, up + 1 + p.headDx, Bu - 33 + p.headDy, 9, 8, c); rect(L, up - 9 + p.headDx, Bu - 33 + p.headDy, 18, 17, c); });
  arm(img, sB, [sB[0] + p.handB[0], sB[1] + p.handB[1]], SERIN.robe, SKIN);
  for (const leg of [p.legL, p.legR]) { const lx = X + leg.x, bot = B - leg.lift; part(img, SERIN.boots, (L, c) => rect(L, lx - 2, bot - 5, 5, 5, c)); }
  part(img, SERIN.robe, (L, c) => { rect(L, up - 5, Bu - 26, 11, 12, c); poly(L, [[up - 6, Bu - 15], [up + 6, Bu - 15], [X + 10 + p.hem, B - 4], [X - 10 + p.hem, B - 4]], c); });
  part(img, SERIN.blue, (L, c) => { rect(L, up - 1, Bu - 22, 3, 18 - p.sink, c); });
  part(img, SERIN.trim, (L, c) => { rect(L, up - 6, Bu - 16, 13, 2, c); rect(L, up - 6, B - 6, 0, 0, c); poly(L, [[X - 10 + p.hem, B - 6], [X + 10 + p.hem, B - 6], [X + 10 + p.hem, B - 4], [X - 10 + p.hem, B - 4]], c); });
  part(img, SERIN.trim, (L, c) => { ellipse(L, up - 7, Bu - 24, 3.2, 2.8, c); ellipse(L, up + 7, Bu - 24, 3.2, 2.8, c); rect(L, up - 3, Bu - 26, 7, 2, c); });
  const hx = up + 1 + p.headDx, hy = Bu - 34 + p.headDy;
  face(img, hx, hy + 1, p, hex('#2d78d0'));
  part(img, SERIN.hair, (L, c) => { ellipse(L, hx, hy - 4, 8, 4.6, c); poly(L, [[hx - 6, hy - 3], [hx + 7, hy - 3], [hx + 5, hy + 1], [hx + 1, hy - 1], [hx - 4, hy + 2]], c); rect(L, hx - 9, hy - 2, 3, 14, c); rect(L, hx + 7, hy - 2, 3, 14, c); });
  part(img, SERIN.trim, (L, c) => rect(L, hx - 6, hy - 6, 13, 2, c));
  if (p.weapon.glow > 0.3) { ring(img, hx, hy - 12, 8, 2.6, SERIN.halo.base, 1); ring(img, hx, hy - 13, 8, 2.6, SERIN.halo.light, 1); }
  const hF = [sF[0] + p.handF[0], sF[1] + p.handF[1]], w = p.weapon;
  const top = polar(hF[0], hF[1], w.ang, w.len), bot = polar(hF[0], hF[1], w.ang + 180, 9);
  part(img, SERIN.staff, (L, c) => line(L, bot[0], bot[1], top[0], top[1], c, 2));
  part(img, SERIN.staff, (L, c) => { ellipse(L, top[0], top[1] - 1, 4.2, 4.2, c); });
  part(img, SERIN.gem, (L, c) => ellipse(L, top[0], top[1] - 1, 2.2, 2.2, c));
  part(img, SERIN.staff, (L, c) => { rect(L, top[0] - 1, top[1] - 8, 2, 4, c); rect(L, top[0] - 3, top[1] - 7, 6, 2, c); });
  if (w.glow) part(img, SERIN.gem, (L, c) => ellipse(L, top[0], top[1] - 1, 3.4 + w.glow * 1.5, 3.4 + w.glow * 1.5, c));
  arm(img, sF, hF, SERIN.robe, SKIN);
  if (p.sparks) sparkles(img, top[0], top[1], p.sparks, hex('#d4fff8'));
  return finish(img, p, 0.3);
}
export const CHARACTERS = { leon: drawLeon, elia: drawElia, serin: drawSerin };
