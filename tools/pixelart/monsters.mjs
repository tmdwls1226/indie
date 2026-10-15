// Monster sprites, drawn procedurally on a 96x72 canvas with the feet / belly on y = 67.
// Everything is drawn facing right and mirrored at the end so enemies face the heroes (left).
import { Img, hex, rect, ellipse, ring, line, poly, part, outline, tint, flipH } from './lib.mjs';

export const MW = 96, MH = 72, MCX = 48, MG = 67;
const pal = (base, light, dark) => ({ base: hex(base), light: hex(light), dark: hex(dark) });
const polar = (x, y, ang, len) => [x + Math.cos((ang * Math.PI) / 180) * len, y + Math.sin((ang * Math.PI) / 180) * len];
const finish = (img, p, f = 0.25) => { outline(img, f); const out = p.flash ? tint(img, hex('#ffffff'), p.flash) : img; return flipH(out); };
const clipBelow = (L, y) => { for (let j = Math.ceil(y); j < L.h; j++) for (let i = 0; i < L.w; i++) L.d[(j * L.w + i) * 4 + 3] = 0; };

// ============ SLIME ============
const SLIME = pal('#4fd45c', '#b4ffb0', '#1d8a3c');
export function drawSlime(p) {
  const img = new Img(MW, MH), cx = MCX + (p.dx ?? 0), base = MG + (p.dy ?? 0), w = p.w ?? 40, h = p.h ?? 28;
  part(img, SLIME, (L, c) => { ellipse(L, cx, base - h * 0.55, w / 2, h * 0.62, c); clipBelow(L, base + 1); if (h < 12) rect(L, cx - w / 2, base - 3, w, 3, c); });
  // glossy highlights and inner shadow
  part(img, { base: hex('#8cf59a'), light: hex('#d9ffd2'), dark: hex('#5cd070') }, (L, c) => ellipse(L, cx - w * 0.22, base - h * 0.72, w * 0.1, h * 0.1, c));
  const ey = base - h * 0.5, ex = w * 0.15;
  if (h >= 14) {
    if (p.eyes === 'closed') { line(img, cx - ex - 4, ey, cx - ex, ey + 2, hex('#173a22'), 1); line(img, cx + ex - 1, ey + 2, cx + ex + 4, ey, hex('#173a22'), 1); }
    else for (const sx of [-ex, ex]) { rect(img, cx + sx - 2, ey - 2, 4, 5, hex('#12331c')); img.set(cx + sx - 1, ey - 1, hex('#ffffff')); }
    if (p.mouth) rect(img, cx - 3, ey + 5, 7, 3, hex('#12331c')); else line(img, cx - 2, ey + 6, cx + 2, ey + 6, hex('#12331c'), 1);
    if (p.angry !== false) { line(img, cx - ex - 4, ey - 4, cx - ex + 1, ey - 3, hex('#12331c'), 1); line(img, cx + ex - 1, ey - 3, cx + ex + 4, ey - 4, hex('#12331c'), 1); }
  }
  for (const [dx, dy] of p.drops ?? []) { part(img, SLIME, (L, c) => ellipse(L, cx + dx, base + dy, 2, 2, c)); }
  return finish(img, p, 0.3);
}

// ============ GOBLIN ============
const GOB = { skin: pal('#7cae3c', '#b6e468', '#4a7420'), rag: pal('#7a5a34', '#a07e4c', '#43301a'), pants: pal('#4a3a26', '#6a553a', '#2a2014'), wood: pal('#7a5430', '#a07848', '#40291a'), iron: pal('#aab4c0', '#e6edf5', '#6a7482') };
export function drawGoblin(p) {
  const img = new Img(MW, MH), X = MCX + p.dx, B = MG + p.dy, Bu = B + p.sink, up = X + p.lean;
  const sB = [up - 5, Bu - 22], sF = [up + 5, Bu - 22];
  for (const leg of [p.legL, p.legR]) { const lx = X + leg.x, bot = B - leg.lift, top = Bu - 11; part(img, GOB.pants, (L, c) => rect(L, lx - 1, top, 4, Math.max(1, bot - top - 2), c)); part(img, GOB.skin, (L, c) => rect(L, lx - 1, bot - 2, 6, 2, c)); }
  // back arm + torso (ragged tunic)
  part(img, GOB.skin, (L, c) => line(L, sB[0], sB[1], sB[0] + p.handB[0], sB[1] + p.handB[1], c, 2));
  part(img, GOB.rag, (L, c) => { rect(L, up - 5, Bu - 23, 10, 12, c); poly(L, [[up - 5, Bu - 12], [up + 5, Bu - 12], [up + 4, Bu - 8], [up + 1, Bu - 10], [up - 2, Bu - 7], [up - 5, Bu - 9]], c); });
  part(img, GOB.pants, (L, c) => rect(L, up - 5, Bu - 15, 10, 2, c));
  // big head with long pointed ears
  const hx = up + 1 + p.headDx, hy = Bu - 29 + p.headDy;
  part(img, GOB.skin, (L, c) => { ellipse(L, hx, hy, 7, 6, c); poly(L, [[hx - 6, hy - 2], [hx - 15, hy - 8], [hx - 6, hy + 2]], c); poly(L, [[hx + 6, hy - 2], [hx + 15, hy - 8], [hx + 6, hy + 2]], c); rect(L, hx + 6, hy, 2, 3, c); });
  if (p.eyes === 'open') for (const ex of [hx - 4, hx + 1]) { rect(img, ex, hy - 2, 3, 3, hex('#ffe03a')); img.set(ex + 1, hy - 1, hex('#8a1010')); }
  else if (p.eyes === 'closed') for (const ex of [hx - 4, hx + 1]) rect(img, ex, hy - 1, 3, 1, hex('#2a3a14'));
  else for (const ex of [hx - 4, hx + 1]) { img.set(ex, hy - 2, hex('#2a3a14')); img.set(ex + 2, hy - 2, hex('#2a3a14')); img.set(ex + 1, hy - 1, hex('#2a3a14')); img.set(ex, hy, hex('#2a3a14')); img.set(ex + 2, hy, hex('#2a3a14')); }
  line(img, hx - 4, hy - 4, hx - 1, hy - 3, hex('#2a3a14'), 1);
  rect(img, hx - 2, hy + 2, p.mouth ? 5 : 4, p.mouth ? 3 : 1, hex('#2a1410')); img.set(hx - 2, hy + 2, hex('#ffffff')); img.set(hx + 1, hy + 2, hex('#ffffff'));
  // spear
  const hF = [sF[0] + p.handF[0], sF[1] + p.handF[1]], w = p.weapon, tip = polar(hF[0], hF[1], w.ang, w.len), back = polar(hF[0], hF[1], w.ang + 180, 8);
  part(img, GOB.wood, (L, c) => line(L, back[0], back[1], tip[0], tip[1], c, 2));
  const a = polar(tip[0], tip[1], w.ang, 6), b1 = polar(tip[0], tip[1], w.ang + 90, 3), b2 = polar(tip[0], tip[1], w.ang - 90, 3);
  part(img, GOB.iron, (L, c) => poly(L, [b1, a, b2], c));
  part(img, GOB.skin, (L, c) => line(L, sF[0], sF[1], hF[0], hF[1], c, 2));
  part(img, GOB.skin, (L, c) => rect(L, hF[0] - 1, hF[1] - 1, 3, 3, c));
  return finish(img, p, 0.22);
}

// ============ SKELETON (soldier) ============
const BONE = pal('#e6e0c8', '#fffbea', '#a89f84');
const SKEL = { rust: pal('#9a9488', '#c9c3b4', '#5a554c'), wood: pal('#7a5430', '#a07848', '#40291a'), rim: pal('#8a8f9a', '#c4c9d4', '#4c515c') };
export function drawSkeleton(p) {
  const img = new Img(MW, MH), X = MCX + p.dx, B = MG + p.dy, Bu = B + p.sink, up = X + p.lean;
  const sB = [up - 6, Bu - 25], sF = [up + 6, Bu - 25];
  for (const leg of [p.legL, p.legR]) { const lx = X + leg.x, bot = B - leg.lift, top = Bu - 12; part(img, BONE, (L, c) => { rect(L, lx, top, 2, Math.max(1, bot - top - 1), c); rect(L, lx - 1, bot - 2, 5, 2, c); rect(L, lx - 1, top + (bot - top) / 2 - 1, 4, 2, c); }); }
  // spine, ribs and pelvis
  part(img, BONE, (L, c) => { rect(L, up, Bu - 25, 2, 14, c); rect(L, up - 4, Bu - 12, 10, 3, c); });
  for (let i = 0; i < 4; i++) part(img, BONE, (L, c) => { rect(L, up - 5, Bu - 24 + i * 3, 12, 2, c); });
  rect(img, up, Bu - 24, 2, 11, hex('#6a6454'));
  // skull
  const hx = up + 1 + p.headDx, hy = Bu - 32 + p.headDy;
  part(img, BONE, (L, c) => { ellipse(L, hx, hy, 6.5, 6, c); rect(L, hx - 4, hy + 4, 9, 4, c); });
  for (const ex of [hx - 4, hx + 1]) { rect(img, ex, hy - 2, 3, 4, hex('#16121a')); if (p.eyes === 'open') img.set(ex + 1, hy - 1, hex('#ff3a3a')); }
  rect(img, hx - 1, hy + 2, 2, 2, hex('#16121a'));
  for (let i = 0; i < 4; i++) rect(img, hx - 3 + i * 2, hy + 5, 1, 2, hex('#16121a'));
  // shield on the back arm
  const hB = [sB[0] + p.handB[0], sB[1] + p.handB[1]];
  part(img, BONE, (L, c) => line(L, sB[0], sB[1], hB[0], hB[1], c, 2));
  part(img, SKEL.wood, (L, c) => ellipse(L, hB[0] - 1, hB[1] + 1, 6, 7, c)); part(img, SKEL.rim, (L, c) => { ring(L, hB[0] - 1, hB[1] + 1, 6, 7, c, 1); });
  // rusty sword in the front hand
  const hF = [sF[0] + p.handF[0], sF[1] + p.handF[1]], w = p.weapon, tip = polar(hF[0], hF[1], w.ang, w.len), back = polar(hF[0], hF[1], w.ang + 180, 4);
  part(img, SKEL.rust, (L, c) => line(L, hF[0], hF[1], tip[0], tip[1], c, 3));
  const g1 = polar(hF[0], hF[1], w.ang + 90, 4), g2 = polar(hF[0], hF[1], w.ang - 90, 4);
  part(img, SKEL.wood, (L, c) => { line(L, g1[0], g1[1], g2[0], g2[1], c, 1); line(L, hF[0], hF[1], back[0], back[1], c, 2); });
  part(img, BONE, (L, c) => line(L, sF[0], sF[1], hF[0], hF[1], c, 2));
  return finish(img, p, 0.2);
}
/** A pile of bones for the final death frame. */
export function drawBonePile(skin = 1) {
  const img = new Img(MW, MH), x = MCX, y = MG;
  part(img, BONE, (L, c) => { ellipse(L, x - 2, y - 4, 6, 5, c); rect(L, x - 5, y - 1, 9, 2, c); });
  rect(img, x - 6, y - 6, 3, 3, hex('#16121a')); rect(img, x - 1, y - 6, 3, 3, hex('#16121a'));
  part(img, BONE, (L, c) => { line(L, x + 6, y - 2, x + 18, y - 1, c, 2); line(L, x - 18, y - 1, x - 8, y - 3, c, 2); line(L, x + 4, y - 5, x + 12, y - 8, c, 2); rect(L, x + 10, y - 3, 7, 2, c); });
  part(img, SKEL.rust, (L, c) => line(L, x + 14, y, x + 30, y - 1, c, 2));
  part(img, SKEL.wood, (L, c) => ellipse(L, x - 16, y - 3, 5, 3, c));
  return finish(img, { flash: 0 }, 0.2);
}
// ============ WOLF (quadruped, side view) ============
const FUR = pal('#5d6486', '#8e96b8', '#363c58'), BELLY = pal('#aeb4cc', '#dde1f0', '#7a809c');
export function drawWolf(p0) {
  const p = { dx: 0, dy: 0, ...p0 };
  const img = new Img(MW, MH), cx = MCX - 5 + p.dx, B = MG + p.dy, lean = p.lean ?? 0;
  if (p.lying) {
    part(img, FUR, (L, c) => { ellipse(L, cx, B - 7, 20, 6.5, c); ellipse(L, cx + 20, B - 6, 6, 5, c); poly(L, [[cx + 22, B - 7], [cx + 33, B - 4], [cx + 22, B - 3]], c); });
    part(img, FUR, (L, c) => { poly(L, [[cx - 18, B - 9], [cx - 32, B - 5], [cx - 18, B - 5]], c); for (const lx of [-10, -3, 8, 14]) rect(L, cx + lx, B - 5, 11, 3, c); });
    part(img, FUR, (L, c) => { poly(L, [[cx + 17, B - 11], [cx + 20, B - 17], [cx + 22, B - 11]], c); });
    line(img, cx + 19, B - 8, cx + 24, B - 4, hex('#16121a'), 1); line(img, cx + 24, B - 8, cx + 19, B - 4, hex('#16121a'), 1);
    rect(img, cx + 29, B - 4, 4, 2, hex('#e05a68'));
    return finish(img, p, 0.28);
  }
  // tail
  part(img, FUR, (L, c) => poly(L, [[cx - 16, B - 23], [cx - 17, B - 19], [cx - 27 + (p.tail ?? 0), B - 28 + (p.tail ?? 0) / 2], [cx - 23 + (p.tail ?? 0), B - 22]], c));
  // far legs, body, near legs
  const L1 = p.legs ?? [0, 0, 0, 0];
  const legAt = (x, off, lift, tone) => part(img, tone, (L, c) => { rect(L, cx + x + off, B - 15, 4, 11 - lift, c); rect(L, cx + x + off, B - 4 - lift, 6, 3, c); });
  legAt(-9, L1[0], 0, FUR); legAt(11, L1[2], 0, FUR);
  part(img, FUR, (L, c) => { ellipse(L, cx - 1 + lean * 0.3, B - 20, 18, 8.5, c); ellipse(L, cx + 10 + lean * 0.6, B - 21, 9, 8.5, c); });
  part(img, BELLY, (L, c) => ellipse(L, cx + 1, B - 14, 11, 2.6, c));
  legAt(-14, L1[1], p.lift?.[1] ?? 0, FUR); legAt(15, L1[3], p.lift?.[3] ?? 0, FUR);
  // head
  const hx = cx + 20 + lean, hy = B - 27 + (p.headDy ?? 0);
  part(img, FUR, (L, c) => { ellipse(L, hx, hy, 7, 6, c); poly(L, [[hx + 3, hy - 3], [hx + 15, hy + 1], [hx + 14, hy + 4], [hx + 3, hy + 4]], c); poly(L, [[hx - 3, hy - 5], [hx - 1, hy - 12], [hx + 3, hy - 5]], c); poly(L, [[hx + 1, hy - 5], [hx + 5, hy - 11], [hx + 6, hy - 4]], c); });
  if (p.jaw) { part(img, FUR, (L, c) => poly(L, [[hx + 2, hy + 3], [hx + 14, hy + 6 + p.jaw], [hx + 11, hy + 8 + p.jaw], [hx + 1, hy + 6], c ? [hx, hy + 5] : [hx, hy + 5]], c)); rect(img, hx + 5, hy + 4, 8, 1 + p.jaw, hex('#7a1a2a')); for (let i = 0; i < 3; i++) { img.set(hx + 6 + i * 3, hy + 4, hex('#ffffff')); img.set(hx + 6 + i * 3, hy + 5 + p.jaw, hex('#ffffff')); } }
  else rect(img, hx + 6, hy + 3, 6, 1, hex('#1a1a28'));
  rect(img, hx + 14, hy, 2, 2, hex('#14141c'));
  if (p.eyes === 'closed') rect(img, hx + 1, hy - 1, 3, 1, hex('#14141c')); else { rect(img, hx + 1, hy - 2, 3, 2, hex('#ffb02a')); img.set(hx + 3, hy - 2, hex('#14141c')); }
  return finish(img, p, 0.28);
}

// ============ SPIDER ============
const SP = pal('#34304a', '#5a5478', '#1a1826'), SPLEG = pal('#2c2840', '#4a4468', '#171522');
export function drawSpider(p0) {
  const p = { dx: 0, dy: 0, ...p0 };
  const img = new Img(MW, MH), cx = MCX + p.dx, B = MG + p.dy, bob = p.bob ?? 0, f = p.feet ?? [0, 0, 0, 0], up = p.up ?? 0;
  const legs = (side, tone) => {
    for (let i = 0; i < 4; i++) {
      const hipX = cx + (side > 0 ? 3 : 0) + i * 4 - 1, hipY = B - 18 + bob, reach = (i - 1.5) * 9 + (side > 0 ? 4 : -2), footX = hipX + reach * 1.5 + f[i] * (side > 0 ? 1 : -1), kneeX = hipX + reach * 0.85, kneeY = B - 34 + bob + (i === 3 ? up : 0) - (i === 0 ? up : 0);
      const footY = p.dead ? B - 28 + bob - i * 1 : B - (side > 0 ? 0 : 3) - (i === 0 ? up * 1.6 : 0);
      part(img, tone, (L, c) => { line(L, hipX, hipY, kneeX, kneeY, c, 2); line(L, kneeX, kneeY, footX, footY, c, 2); });
      img.set(Math.round(kneeX), Math.round(kneeY), hex('#d8303e'));
    }
  };
  legs(-1, SPLEG);
  part(img, SP, (L, c) => ellipse(L, cx - 9, B - 20 + bob, 12, 10, c));
  part(img, pal('#e0303e', '#ff7080', '#8a1220'), (L, c) => { poly(L, [[cx - 12, B - 24 + bob], [cx - 6, B - 24 + bob], [cx - 9, B - 20 + bob]], c); poly(L, [[cx - 9, B - 20 + bob], [cx - 12, B - 15 + bob], [cx - 6, B - 15 + bob]], c); });
  part(img, SP, (L, c) => ellipse(L, cx + 8 + (p.lunge ?? 0), B - 19 + bob, 8, 6.5, c));
  legs(1, SP);
  const hx = cx + 12 + (p.lunge ?? 0), hy = B - 20 + bob;
  for (const [ex, ey] of p.eyes === 'closed' ? [] : [[-1, -3], [2, -4], [4, -2], [1, -1]]) img.set(hx + ex, hy + ey, hex('#ff2a3a'));
  line(img, hx + 3, hy + 2, hx + 4, hy + 6 + (p.fang ?? 0), hex('#f4f0e0'), 1); line(img, hx + 6, hy + 1, hx + 7, hy + 5 + (p.fang ?? 0), hex('#f4f0e0'), 1);
  return finish(img, p, 0.2);
}

// ============ ORC ============
const ORC = { skin: pal('#5f9440', '#94cc68', '#386a24'), leather: pal('#6a4a2c', '#8e6a40', '#3a2814'), steel: pal('#6b7280', '#a6afbd', '#3a404c'), hair: pal('#3a2a1c', '#5a4430', '#1c140c'), wood: pal('#7a5430', '#a07848', '#40291a'), blade: pal('#9aa4b2', '#dde4ee', '#566070') };
export function drawOrc(p) {
  const img = new Img(MW, MH), X = MCX + p.dx, B = MG + p.dy, Bu = B + p.sink, up = X + p.lean;
  const sB = [up - 11, Bu - 34], sF = [up + 11, Bu - 34];
  for (const leg of [p.legL, p.legR]) { const lx = X + leg.x * 1.4, bot = B - leg.lift, top = Bu - 17; part(img, ORC.leather, (L, c) => rect(L, lx - 3, top, 7, Math.max(1, bot - top - 4), c)); part(img, ORC.steel, (L, c) => rect(L, lx - 3, bot - 5, 9, 5, c)); }
  part(img, ORC.skin, (L, c) => line(L, sB[0], sB[1], sB[0] + p.handB[0], sB[1] + p.handB[1] * 1.3, c, 4));
  part(img, ORC.leather, (L, c) => { rect(L, up - 9, Bu - 36, 19, 20, c); poly(L, [[up - 9, Bu - 17], [up + 10, Bu - 17], [up + 8, Bu - 11], [up - 8, Bu - 11]], c); });
  part(img, ORC.skin, (L, c) => rect(L, up - 4, Bu - 36, 9, 5, c));
  part(img, ORC.steel, (L, c) => { rect(L, up - 9, Bu - 24, 19, 3, c); ellipse(L, up - 12, Bu - 35, 5, 4, c); ellipse(L, up + 12, Bu - 35, 5, 4, c); });
  part(img, ORC.steel, (L, c) => { poly(L, [[up - 15, Bu - 38], [up - 13, Bu - 44], [up - 11, Bu - 38]], c); poly(L, [[up + 11, Bu - 38], [up + 13, Bu - 44], [up + 15, Bu - 38]], c); });
  const hx = up + 2 + p.headDx, hy = Bu - 42 + p.headDy;
  part(img, ORC.hair, (L, c) => poly(L, [[hx - 3, hy - 6], [hx - 6, hy - 13], [hx - 1, hy - 8], [hx + 2, hy - 15], [hx + 4, hy - 8], [hx + 8, hy - 12], [hx + 8, hy - 5]], c));
  part(img, ORC.skin, (L, c) => { ellipse(L, hx, hy, 8, 7, c); rect(L, hx - 6, hy + 3, 13, 5, c); });
  if (p.eyes === 'open') for (const ex of [hx - 5, hx + 1]) { rect(img, ex, hy - 2, 3, 2, hex('#ffd02a')); img.set(ex + 1, hy - 2, hex('#7a1010')); line(img, ex - 1, hy - 4, ex + 3, hy - 3, hex('#1c2a10'), 1); }
  else for (const ex of [hx - 5, hx + 1]) rect(img, ex, hy - 1, 3, 1, hex('#1c2a10'));
  rect(img, hx - 3, hy + 3, 8, p.mouth ? 3 : 1, hex('#2a1410'));
  for (const tx of [hx - 4, hx + 3]) { poly(img, [[tx, hy + 3], [tx + 2, hy + 3], [tx + 1, hy - 1]], hex('#f2ecd2')); }
  // axe
  const hF = [sF[0] + p.handF[0], sF[1] + p.handF[1]], w = p.weapon, tip = polar(hF[0], hF[1], w.ang, w.len), back = polar(hF[0], hF[1], w.ang + 180, 8);
  part(img, ORC.wood, (L, c) => line(L, back[0], back[1], tip[0], tip[1], c, 3));
  const m = polar(hF[0], hF[1], w.ang, w.len - 5), o1 = polar(m[0], m[1], w.ang + 90, 10), o2 = polar(m[0], m[1], w.ang - 90, 10), o1b = polar(o1[0], o1[1], w.ang, 6), o2b = polar(o2[0], o2[1], w.ang, 6);
  part(img, ORC.blade, (L, c) => poly(L, [m, o1, o1b, polar(m[0], m[1], w.ang, 10)], c));
  part(img, ORC.skin, (L, c) => { line(L, sF[0], sF[1], hF[0], hF[1], c, 4); rect(L, hF[0] - 2, hF[1] - 2, 5, 5, c); });
  return finish(img, p, 0.22);
}

// ============ GOLEM ============
const ROCK = pal('#8c7c6a', '#bcae96', '#52463a'), GLOW = hex('#58c8ff'), GLOWD = hex('#2a78c0');
export function drawGolem(p) {
  const img = new Img(MW, MH), X = MCX + p.dx, B = MG + p.dy, Bu = B + p.sink, up = X + p.lean;
  if (p.rubble) {
    const R = p.rubble;
    for (const [dx, dy, rx, ry] of [[-18, -4, 7, 4], [-8, -7, 9, 6], [4, -9, 10, 7], [16, -5, 8, 5], [24, -2, 5, 3], [-26, -2, 5, 3], [0, -3, 8, 4]].slice(0, 3 + R)) part(img, ROCK, (L, c) => ellipse(L, X + dx, B + dy, rx, ry, c));
    for (const [dx, dy] of [[-8, -8], [4, -10], [16, -6]].slice(0, p.glowBits ?? 0)) { rect(img, X + dx, B + dy, 3, 2, GLOW); }
    return finish(img, p, 0.28);
  }
  const sB = [up - 15, Bu - 38], sF = [up + 15, Bu - 38];
  for (const leg of [p.legL, p.legR]) { const lx = X + leg.x * 2.2, bot = B - leg.lift, top = Bu - 18; part(img, ROCK, (L, c) => { rect(L, lx - 5, top, 11, Math.max(2, bot - top), c); ellipse(L, lx, bot - 3, 7, 3.5, c); }); }
  part(img, ROCK, (L, c) => line(L, sB[0], sB[1], sB[0] + p.handB[0], sB[1] + p.handB[1], c, 8));
  part(img, ROCK, (L, c) => { ellipse(L, up, Bu - 29, 15, 13, c); ellipse(L, up - 9, Bu - 35, 7, 6, c); ellipse(L, up + 9, Bu - 35, 7, 6, c); rect(L, up - 9, Bu - 20, 19, 7, c); });
  for (const [dx, dy, dx2, dy2] of [[-6, -30, -2, -24], [-2, -24, -5, -18], [4, -32, 6, -25], [6, -25, 2, -19]]) line(img, up + dx, Bu + dy, up + dx2, Bu + dy2, GLOW, 1);
  part(img, ROCK, (L, c) => { rect(L, up - 6 + p.headDx, Bu - 49 + p.headDy, 13, 11, c); });
  if (p.eyes === 'open') for (const ex of [-4, 1]) { rect(img, up + ex + p.headDx, Bu - 45 + p.headDy, 3, 2, GLOW); } else for (const ex of [-4, 1]) rect(img, up + ex + p.headDx, Bu - 44 + p.headDy, 3, 1, GLOWD);
  const hF = [sF[0] + p.handF[0], sF[1] + p.handF[1]];
  part(img, ROCK, (L, c) => { line(L, sF[0], sF[1], hF[0], hF[1], c, 8); ellipse(L, hF[0], hF[1] + 2, 6.5, 6, c); });
  return finish(img, p, 0.28);
}

// ============ BAT ============
const MEM = pal('#6a3a7e', '#9a62b4', '#3d2250'), BATB = pal('#3a2a44', '#5a4468', '#1e1426');
export function drawBat(p0) {
  const p = { dx: 0, dy: 0, ...p0 };
  const img = new Img(MW, MH), cx = MCX + p.dx, cy = (p.cy ?? 32) + (p.dy ?? 0), wing = p.wing ?? 0;
  if (p.grounded) {
    part(img, BATB, (L, c) => ellipse(L, cx, MG - 6, 9, 5, c)); part(img, MEM, (L, c) => { poly(L, [[cx - 20, MG - 2], [cx - 6, MG - 9], [cx + 6, MG - 9], [cx + 20, MG - 2], [cx + 10, MG], [cx - 10, MG]], c); });
    part(img, BATB, (L, c) => ellipse(L, cx + 11, MG - 8, 5, 4, c)); line(img, cx + 9, MG - 9, cx + 12, MG - 7, hex('#16121a'), 1); line(img, cx + 12, MG - 9, cx + 9, MG - 7, hex('#16121a'), 1);
    return finish(img, p, 0.28);
  }
  const tipY = cy - 6 - wing, tipX = 29;
  for (const side of [-1, 1]) {
    const sx = cx + side * 3, tx = cx + side * tipX, mid1 = [cx + side * 16, tipY + 7 + (wing > 0 ? -2 : 3)], mid2 = [cx + side * 22, tipY + 13], mid3 = [cx + side * 10, cy + 8];
    part(img, MEM, (L, c) => poly(L, [[sx, cy - 3], [tx, tipY], mid1, [tx - side * 3, tipY + 13], mid2.map((v, i) => (i ? v - 2 : v)), mid3, [cx + side * 3, cy + 6]], c));
    part(img, BATB, (L, c) => { line(L, sx, cy - 3, tx, tipY, c, 2); });
  }
  part(img, BATB, (L, c) => { ellipse(L, cx, cy + 1, 5.5, 7, c); });
  const hy = cy - 7 + (p.headDy ?? 0);
  part(img, BATB, (L, c) => { ellipse(L, cx, hy, 5, 4.6, c); poly(L, [[cx - 5, hy - 2], [cx - 7, hy - 9], [cx - 2, hy - 4]], c); poly(L, [[cx + 5, hy - 2], [cx + 7, hy - 9], [cx + 2, hy - 4]], c); });
  if (p.eyes === 'closed') { rect(img, cx - 3, hy - 1, 2, 1, hex('#e0e0e0')); rect(img, cx + 1, hy - 1, 2, 1, hex('#e0e0e0')); } else { rect(img, cx - 3, hy - 2, 2, 2, hex('#ff2a3a')); rect(img, cx + 1, hy - 2, 2, 2, hex('#ff2a3a')); }
  rect(img, cx - 2, hy + 2, p.mouth ? 5 : 3, p.mouth ? 3 : 1, hex('#5a1020')); img.set(cx - 2, hy + 2, hex('#ffffff')); img.set(cx + 2, hy + 2, hex('#ffffff'));
  return finish(img, p, 0.25);
}
export const POSE = { dx: 0, dy: 0, sink: 0, lean: 0, headDy: 0, headDx: 0, legL: { x: -3, lift: 0 }, legR: { x: 3, lift: 0 }, handB: [-2, 8], handF: [1, 8], weapon: { ang: 40, len: 18 }, eyes: 'open', mouth: 0, flash: 0 };
export const pose = (o = {}) => ({ ...POSE, ...o, legL: { ...POSE.legL, ...o.legL }, legR: { ...POSE.legR, ...o.legR }, weapon: { ...POSE.weapon, ...o.weapon } });
