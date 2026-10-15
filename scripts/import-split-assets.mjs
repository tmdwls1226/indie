// One-off importer: turns the concept-sheet crops in "TURNBOUND_PNG_분할_에셋" into placeholder game assets under
// public/assets/ (transparent background, labels and panel borders removed, frames separated).
//
//   node scripts/import-split-assets.mjs <source-folder> [--out public/assets] [--preview preview.png]
//
// The sources are low-resolution, fully opaque crops, so the output is a PLACEHOLDER. Real art dropped into
// the same file names simply overwrites it (see public/assets/README.md).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const args = process.argv.slice(2);
const SRC = args[0];
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const OUT = path.resolve(opt('--out', 'public/assets'));
const PREVIEW = opt('--preview', '');
if (!SRC) { console.error('usage: node scripts/import-split-assets.mjs <source-folder> [--out dir] [--preview file.png]'); process.exit(1); }

// ---------- minimal PNG codec (8-bit RGBA, non-interlaced) ----------
function decodePng(buf) {
  let p = 8, w = 0, h = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error('only 8-bit RGBA non-interlaced PNG is supported'); }
    else if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * 4, out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? out[y * stride + x - 4] : 0, b = y > 0 ? out[(y - 1) * stride + x] : 0, c = x >= 4 && y > 0 ? out[(y - 1) * stride + x - 4] : 0;
      let v = row[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * stride + x] = v & 255;
    }
  }
  return { w, h, data: out };
}
function encodePng({ w, h, data }) {
  const stride = w * 4, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; Buffer.from(data.buffer, data.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1); }
  const chunk = (type, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(type, 4, 'ascii'); d.copy(b, 8); b.writeUInt32BE(zlib.crc32(b.subarray(4, 8 + d.length)) >>> 0, 8 + d.length); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- image helpers ----------
const px = (im, x, y) => (y * im.w + x) * 4;
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
function crop(im, x0, y0, x1, y1) {
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(im.w, x1); y1 = Math.min(im.h, y1);
  const w = x1 - x0, h = y1 - y0, data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = px(im, x0 + x, y0 + y), d = (y * w + x) * 4; data[d] = im.data[s]; data[d + 1] = im.data[s + 1]; data[d + 2] = im.data[s + 2]; data[d + 3] = 255; }
  return { w, h, data };
}
// The panel background is a very dark navy; anything clearly brighter or less blue is artwork.
const isBgLike = (r, g, b) => lum(r, g, b) < 42 && b >= r - 4;
const isBorder = (r, g, b) => b > 90 && b > r * 1.6 && g > r && lum(r, g, b) < 150 && Math.abs(g - b) < 90;

/** Make the dark panel background transparent: flood fill from the crop edges through background-like pixels. */
function keyBackground(im) {
  const { w, h, data } = im, seen = new Uint8Array(w * h), stack = [];
  const push = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const i = y * w + x; if (seen[i]) return; const o = i * 4; if (!isBgLike(data[o], data[o + 1], data[o + 2])) return; seen[i] = 1; stack.push(i); };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); } for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) { const i = stack.pop(), x = i % w, y = (i / w) | 0; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
  const out = new Uint8Array(data);
  for (let i = 0; i < w * h; i++) if (seen[i]) out[i * 4 + 3] = 0;
  // soften the rim: dark pixels touching the removed area become semi-transparent instead of leaving a halo
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (seen[i]) continue;
    const near = (x > 0 && seen[i - 1]) || (x < w - 1 && seen[i + 1]) || (y > 0 && seen[i - w]) || (y < h - 1 && seen[i + w]);
    if (near && lum(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) < 70) out[i * 4 + 3] = 110;
  }
  return { w, h, data: out };
}
function trim(im, pad = 1) {
  let x0 = im.w, y0 = im.h, x1 = -1, y1 = -1;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (im.data[px(im, x, y) + 3] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) return im;
  const w = x1 - x0 + 1 + pad * 2, h = y1 - y0 + 1 + pad * 2, data = new Uint8Array(w * h * 4);
  for (let y = 0; y <= y1 - y0; y++) for (let x = 0; x <= x1 - x0; x++) { const s = px(im, x0 + x, y0 + y), d = ((y + pad) * w + x + pad) * 4; data.set(im.data.subarray(s, s + 4), d); }
  return { w, h, data };
}
/** Put frames on equally sized transparent canvases, aligned bottom-centre, so an animation does not jitter. */
function normalize(frames) {
  const W = Math.max(...frames.map(f => f.w)), H = Math.max(...frames.map(f => f.h));
  return frames.map(f => { const data = new Uint8Array(W * H * 4), ox = ((W - f.w) / 2) | 0, oy = H - f.h; for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const s = px(f, x, y), d = ((y + oy) * W + x + ox) * 4; data.set(f.data.subarray(s, s + 4), d); } return { w: W, h: H, data }; });
}
function resizeBilinear(im, nw, nh) {
  const data = new Uint8Array(nw * nh * 4);
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    const sx = Math.min(im.w - 1.001, (x + 0.5) * im.w / nw - 0.5), sy = Math.min(im.h - 1.001, (y + 0.5) * im.h / nh - 0.5), x0 = Math.max(0, Math.floor(sx)), y0 = Math.max(0, Math.floor(sy)), fx = sx - x0, fy = sy - y0;
    for (let c = 0; c < 4; c++) { const a = im.data[px(im, x0, y0) + c], b = im.data[px(im, x0 + 1, y0) + c], d = im.data[px(im, x0, y0 + 1) + c], e = im.data[px(im, x0 + 1, y0 + 1) + c]; data[(y * nw + x) * 4 + c] = a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + d * (1 - fx) * fy + e * fx * fy; }
  }
  return { w: nw, h: nh, data };
}

// ---------- connected components of "artwork" pixels ----------
function components(im, dilate = 2) {
  const { w, h, data } = im, fg = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = px(im, x, y); if (!isBgLike(data[o], data[o + 1], data[o + 2]) && !isBorder(data[o], data[o + 1], data[o + 2])) fg[y * w + x] = 1; }
  const grown = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (fg[y * w + x]) for (let dy = -dilate; dy <= dilate; dy++) for (let dx = -dilate; dx <= dilate; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h) grown[ny * w + nx] = 1; }
  const label = new Int32Array(w * h), comps = []; let n = 0;
  for (let i = 0; i < w * h; i++) {
    if (!grown[i] || label[i]) continue;
    n++; const st = [i]; label[i] = n; let x0 = w, y0 = h, x1 = 0, y1 = 0, area = 0;
    while (st.length) {
      const j = st.pop(), x = j % w, y = (j / w) | 0; if (fg[j]) { area++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (nx >= 0 && ny >= 0 && nx < w && ny < h) { const k = ny * w + nx; if (grown[k] && !label[k]) { label[k] = n; st.push(k); } }
    }
    if (area) comps.push({ x0, y0, x1: x1 + 1, y1: y1 + 1, w: x1 + 1 - x0, h: y1 + 1 - y0, area, cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2 });
  }
  return comps;
}
// Text labels are short, wide-ish and near the top; panel borders hug the image edge; dividers are thin and tall.
const EDGE = 5;
const isFrame = (c, im) => c.x0 <= EDGE || c.y0 <= EDGE || c.x1 >= im.w - EDGE || c.y1 >= im.h - EDGE;
const isDivider = (c, im) => (c.w <= 4 && c.h > im.h * 0.5) || (c.h <= 4 && c.w > im.w * 0.5);
const isText = (c, im) => c.h <= 16 && c.cy < im.h * 0.42 && c.area < 700;
const isSprite = c => c.h >= 18 && c.area >= 160;
const spritesOf = (comps, im) => comps.filter(c => !isFrame(c, im) && !isDivider(c, im) && !isText(c, im) && isSprite(c)).sort((a, b) => a.x0 - b.x0);

// `--debug <file>` prints how a sheet is segmented, to tune the rules above.
const DEBUG = opt('--debug', '');
if (DEBUG) {
  const im = decodePng(fs.readFileSync(fs.existsSync(DEBUG) ? DEBUG : path.join(SRC, DEBUG)));
  console.log(DEBUG, `${im.w}x${im.h}`);
  for (const c of components(im)) console.log(JSON.stringify({ x0: c.x0, y0: c.y0, w: c.w, h: c.h, area: c.area, frame: isFrame(c, im), div: isDivider(c, im), text: isText(c, im), sprite: isSprite(c) }));
  process.exit(0);
}

// ---------- outputs ----------
const written = [];
function save(rel, im) {
  const file = path.join(OUT, rel); fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, encodePng(im)); written.push({ rel, im });
}
const load = name => decodePng(fs.readFileSync(path.join(SRC, name)));
const sprite = (im, c, pad = 2) => trim(keyBackground(crop(im, c.x0 - pad, c.y0 - pad, c.x1 + pad, c.y1 + pad)));

// Heroes: portrait on the left, then six labelled columns (idle, move, attack, skill, hit, down).
const HEROES = [['검사_png1.png', 'leon'], ['마법사_png1.png', 'elia'], ['성직자_png1.png', 'serin']];
const HERO_STATES = ['idle', 'move', 'attack', 'skill', 'hit', 'down'];
function importHero(file, id) {
  const im = load(file), comps = components(im), labelBottom = Math.round(im.h * 0.3);
  // The six pose columns are the six artwork blobs right of the portrait; the labels sit in the strip above them.
  const sprites = spritesOf(comps, im).filter(c => c.x0 > im.w * 0.18 && c.y1 > labelBottom + 12);
  if (sprites.length !== 6) console.warn(`  ! ${file}: expected 6 pose columns, found ${sprites.length}`);
  sprites.slice(0, 6).forEach((c, i) => {
    const state = HERO_STATES[i]; if (state === 'move') return;
    save(`characters/${id}/${id}_${state}.png`, sprite(im, { x0: c.x0, y0: Math.max(c.y0, labelBottom), x1: c.x1, y1: c.y1 }));
  });
  const firstX = Math.min(...sprites.map(s => s.x0)) - 5;
  save(`characters/${id}/${id}_portrait.png`, crop(im, 3, 3, firstX, Math.round(im.h * 0.78)));
}
// Monsters: title label, then several poses of the same creature. Only sheets whose sprites are fully visible are used;
// the wolf / spider / orc / golem / bat / zombie crops are cut off at the bottom edge and are skipped.
const MONSTERS = [['슬라임_png1.png', 'slime', { pick: 'firstColumn', dilate: 0 }], ['고블린_png1.png', 'goblin', { pick: 'all' }], ['스켈레톤_png1.png', 'skeleton', { pick: 'all', dilate: 1 }]];
function importMonster(file, id, o) {
  const im = load(file), comps = components(im, o.dilate ?? 2), sp = spritesOf(comps, im);
  if (!sp.length) { console.warn(`  ! ${file}: no sprite found`); return; }
  let pick = sp;
  if (o.pick === 'first') pick = [sp[0]];
  if (o.pick === 'firstColumn') { const left = sp[0]; pick = sp.filter(s => Math.abs(s.cx - left.cx) < left.w * 0.8).sort((a, b) => a.y0 - b.y0); }
  const frames = normalize(pick.slice(0, 4).map(c => sprite(im, c)));
  frames.forEach((f, i) => save(frames.length > 1 ? `monsters/${id}/${id}_idle_${String(i + 1).padStart(2, '0')}.png` : `monsters/${id}/${id}_idle.png`, f));
}
// Full creature sheets (art-source/monster-sheets/<id>.png): one big portrait on the left and five labelled rows on the right
// (idle, move, attack, hit, death). Rows become animated states; the last death frame is the "down" pose.
function importCreatureSheet(file, id, o = {}) {
  const im = decodePng(fs.readFileSync(file)), comps = components(im, o.dilate ?? 2);
  // The portrait is the tall artwork on the left, possibly split into several pieces (legs, wings); no single pose is that tall.
  const pieces = comps.filter(c => c.h > 120 && c.x0 < im.w * 0.4);
  const big = pieces.length ? { x0: Math.min(...pieces.map(c => c.x0)), y0: Math.min(...pieces.map(c => c.y0)), x1: Math.max(...pieces.map(c => c.x1)), y1: Math.max(...pieces.map(c => c.y1)) } : null;
  const frames = comps.filter(c => !pieces.includes(c) && !isDivider(c, im) && c.area >= 250 && c.h >= 28 && c.w >= 35 && (!big || c.x0 >= big.x1 - 2)).sort((a, b) => a.cy - b.cy || a.x0 - b.x0);
  const rows = [];
  for (const c of frames) { const row = rows[rows.length - 1]; if (row && Math.abs(c.cy - row.cy) < 35) { row.items.push(c); row.cy = (row.cy * (row.items.length - 1) + c.cy) / row.items.length; } else rows.push({ cy: c.cy, items: [c] }); }
  if (rows.length < 5) console.warn(`  ! ${file}: expected 5 state rows, found ${rows.length}`);
  const cut = row => row.items.sort((a, b) => a.x0 - b.x0).map(c => sprite(im, c));
  const [idle, , attack, hit, death] = rows.map(cut);
  // one shared canvas for every state so the creature does not change size between poses
  const all = normalize([...(idle ?? []), ...(attack ?? []), ...(hit ?? []), ...(death ?? [])]);
  let k = 0; const take = n => { const out = all.slice(k, k + (n ?? 0)); k += n ?? 0; return out; };
  const put = (state, list) => list.forEach((f, i) => save(list.length > 1 ? `monsters/${id}/${id}_${state}_${String(i + 1).padStart(2, '0')}.png` : `monsters/${id}/${id}_${state}.png`, f));
  put('idle', take(idle?.length)); put('attack', take(attack?.length)); put('hit', take(hit?.length));
  const dead = take(death?.length); if (dead.length) save(`monsters/${id}/${id}_down.png`, dead[dead.length - 1]);
  // the title bar occupies the top ~11% of the sheet; keep the portrait panel below it
  if (big) save(`monsters/${id}/${id}_portrait.png`, trim(keyBackground(crop(im, big.x0, Math.max(big.y0, Math.round(im.h * 0.115)), big.x1, big.y1)), 0));
}
const SHEETS_DIR = opt('--sheets', 'art-source/monster-sheets');

// Bosses: the big portrait panel sits under the title; small pose thumbnails below it are ignored.
const BOSSES = [['오염된종지기_보스_png1.png', 'bell_keeper'], ['망각의기사_보스_png1.png', 'forgotten_knight'], ['폭주한마도인형_보스_png1.png', 'mage_doll'], ['시간의섭정_보스_png1.png', 'time_regent'], ['정지의군주_최종보스_png1.png', 'still_lord']];
function importBoss(file, id) {
  // kept opaque: the painted backdrop is part of the portrait (the game fades its edges with a CSS mask)
  const im = load(file), art = crop(im, Math.round(im.w * 0.045), Math.round(im.h * 0.135), Math.round(im.w * 0.955), Math.round(im.h * 0.615));
  save(`bosses/${id}/${id}_idle.png`, art);
}
// Backgrounds: strip the title bar and frame, keep the picture (the title bar is ~17% of the sheet height).
const BACKGROUNDS = [['지하납골당_png1.png', 'crypt/battle'], ['검은숲_png1.png', 'black_forest/battle'], ['마도도시_png1.png', 'belkar/battle'], ['왕도모르가스_png1.png', 'morgas/battle'], ['최종던전_png1.png', 'arca/battle'], ['애쉬벨마을_png1.png', 'ashbell/town']];
function importBackground(file, target) {
  const im = load(file), title = Math.round(im.h * (im.h < 100 ? 0.25 : 0.18)), region = crop(im, 6, title + 2, im.w - 6, im.h - 5);
  save(`backgrounds/${target}.png`, resizeBilinear(region, Math.round(360 * region.w / region.h), 360));
}
fs.mkdirSync(OUT, { recursive: true });
for (const [f, id] of HEROES) { console.log(`hero      ${f} -> ${id}`); importHero(f, id); }
for (const [f, id, o] of MONSTERS) { console.log(`monster   ${f} -> ${id}`); importMonster(f, id, o); }
if (fs.existsSync(SHEETS_DIR)) for (const f of fs.readdirSync(SHEETS_DIR).filter(n => /\.png$/i.test(n))) { const id = f.replace(/\.png$/i, ''); console.log(`creature  ${f} -> ${id}`); importCreatureSheet(path.join(SHEETS_DIR, f), id, id === 'bat' ? { dilate: 1 } : {}); }
for (const [f, id] of BOSSES) { console.log(`boss      ${f} -> ${id}`); importBoss(f, id); }
for (const [f, t] of BACKGROUNDS) { console.log(`backdrop  ${f} -> ${t}`); importBackground(f, t); }
console.log(`\nwrote ${written.length} files to ${OUT}`);

if (PREVIEW) {
  // contact sheet of everything written, 2x nearest-neighbour on a checkerboard so transparency is visible
  const S = 2, cells = written.map(w => ({ ...w, w: Math.min(w.im.w, 260), h: Math.min(w.im.h, 200) })), PAD = 6, COLS = 6;
  const cw = Math.max(...cells.map(c => c.w)) * S + PAD, ch = Math.max(...cells.map(c => c.h)) * S + PAD, rows = Math.ceil(cells.length / COLS);
  const sheet = { w: cw * COLS, h: ch * rows, data: new Uint8Array(cw * COLS * ch * rows * 4) };
  for (let y = 0; y < sheet.h; y++) for (let x = 0; x < sheet.w; x++) { const v = ((x >> 3) + (y >> 3)) & 1 ? 70 : 52, o = (y * sheet.w + x) * 4; sheet.data[o] = v; sheet.data[o + 1] = v; sheet.data[o + 2] = v; sheet.data[o + 3] = 255; }
  cells.forEach((c, i) => {
    const ox = (i % COLS) * cw + 3, oy = Math.floor(i / COLS) * ch + 3;
    for (let y = 0; y < c.h * S; y++) for (let x = 0; x < c.w * S; x++) {
      const s = px(c.im, Math.min(c.im.w - 1, (x / S) | 0), Math.min(c.im.h - 1, (y / S) | 0)), a = c.im.data[s + 3] / 255, d = ((oy + y) * sheet.w + ox + x) * 4;
      for (let k = 0; k < 3; k++) sheet.data[d + k] = c.im.data[s + k] * a + sheet.data[d + k] * (1 - a);
    }
  });
  fs.writeFileSync(PREVIEW, encodePng(sheet)); console.log(`preview: ${PREVIEW}`);
  console.log(cells.map((c, i) => `${i}: ${c.rel} (${c.im.w}x${c.im.h})`).join('\n'));
}
