// Tiny pixel-art toolkit: flat-colour primitives, rim-lit shading, selective outlines, PNG writer.
// Everything is drawn without anti-aliasing so edges stay crisp (nearest-neighbour friendly).
import fs from 'node:fs';
import zlib from 'node:zlib';

export const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];
export const MASK = [255, 0, 255, 255];

export class Img {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8Array(w * h * 4); }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (!this.inb(x, y)) return; const o = (y * this.w + x) * 4; this.d[o] = c[0]; this.d[o + 1] = c[1]; this.d[o + 2] = c[2]; this.d[o + 3] = c[3] ?? 255; }
  get(x, y) { if (!this.inb(x, y)) return [0, 0, 0, 0]; const o = (y * this.w + x) * 4; return [this.d[o], this.d[o + 1], this.d[o + 2], this.d[o + 3]]; }
  on(x, y) { return this.inb(x, y) && this.d[(y * this.w + x) * 4 + 3] > 0; }
  clone() { const i = new Img(this.w, this.h); i.d.set(this.d); return i; }
  // alpha-over composite of `src` at (dx, dy); fully opaque or fully transparent pixels only (no blending needed)
  blit(src, dx = 0, dy = 0) { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) if (src.on(x, y)) this.set(x + dx, y + dy, src.get(x, y)); return this; }
  bbox() { let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1; for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.on(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return x1 < 0 ? null : { x0, y0, x1, y1 }; }
}

// ---------- primitives ----------
export function rect(img, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) img.set(x + i, y + j, c); }
export function ellipse(img, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const nx = (x - cx) / (rx + 0.35), ny = (y - cy) / (ry + 0.35); if (nx * nx + ny * ny <= 1) img.set(x, y, c);
  }
}
/** Thin elliptical ring (halo, magic circle). `thick` is roughly the ring width in pixels. */
export function ring(img, cx, cy, rx, ry, c, thick = 1) {
  const inner = Math.max(0, 1 - (thick * 2) / Math.min(rx, ry) * 0.5);
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d <= 1.12 && d >= inner) img.set(x, y, c);
  }
}
export function line(img, x0, y0, x1, y1, c, w = 1) {
  if (![x0, y0, x1, y1].every(Number.isFinite)) throw new Error(`line() got a non-finite coordinate: ${x0},${y0} -> ${x1},${y1}`);
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
  const half = Math.floor((w - 1) / 2);
  for (;;) {
    for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) img.set(x0 + i - half, y0 + j - half, c);
    if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
export function poly(img, pts, c) {
  const ys = pts.map(p => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  for (let y = y0; y <= y1; y++) {
    const xs = []; const yy = y + 0.5;
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) img.set(x, y, c);
  }
}

// ---------- shading ----------
/** Recolour a flat-mask layer with rim lighting: lit top/left edge, shaded bottom/right edge. */
export function shade(layer, pal) {
  const out = new Img(layer.w, layer.h);
  for (let y = 0; y < layer.h; y++) for (let x = 0; x < layer.w; x++) {
    if (!layer.on(x, y)) continue;
    const shadow = !layer.on(x, y + 1) || !layer.on(x + 1, y), lit = !layer.on(x - 1, y) || !layer.on(x, y - 1);
    out.set(x, y, shadow && pal.dark ? pal.dark : lit && pal.light ? pal.light : pal.base);
  }
  return out;
}
/** Draw with `fn(layer, MASK)` on a scratch layer, shade it, and composite onto `img`. */
export function part(img, pal, fn) { const L = new Img(img.w, img.h); fn(L, MASK); img.blit(shade(L, pal)); return L; }
const darken = (c, f) => [Math.round(c[0] * f), Math.round(c[1] * f), Math.round(c[2] * f), 255];
export const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), 255];
/** One-pixel selective outline: each border pixel takes a darkened copy of the colour it touches. */
export function outline(img, factor = 0.28, fixed = null) {
  const add = [];
  for (let y = -1; y <= img.h; y++) for (let x = -1; x <= img.w; x++) {
    if (img.on(x, y)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (img.on(x + dx, y + dy)) { add.push([x, y, fixed ?? darken(img.get(x + dx, y + dy), factor)]); break; }
  }
  for (const [x, y, c] of add) img.set(x, y, c);
  return img;
}
export function tint(img, c, amt) { const o = img.clone(); for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) if (o.on(x, y)) o.set(x, y, mix(o.get(x, y), c, amt)); return o; }
export function flipH(img) { const o = new Img(img.w, img.h); for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.on(x, y)) o.set(img.w - 1 - x, y, img.get(x, y)); return o; }
/** Exact 90 degree rotation (clockwise when cw), then shift so the content rests on `groundY` and is centred on `cx`. */
export function rot90(img, cw = true) {
  const o = new Img(img.w, img.h);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.on(x, y)) { const [nx, ny] = cw ? [img.h - 1 - y, x] : [y, img.w - 1 - x]; o.set(nx, ny, img.get(x, y)); }
  return o;
}
export function shift(img, dx, dy) { const o = new Img(img.w, img.h); o.blit(img, dx, dy); return o; }
/** Move content so its bounding box is centred horizontally on `cx` and its lowest row sits on `groundY`. */
export function ground(img, cx, groundY) { const b = img.bbox(); if (!b) return img; return shift(img, Math.round(cx - (b.x0 + b.x1) / 2), groundY - b.y1); }

// ---------- PNG ----------
export function encodePng(img) {
  const stride = img.w * 4, raw = Buffer.alloc((stride + 1) * img.h);
  for (let y = 0; y < img.h; y++) { raw[y * (stride + 1)] = 0; Buffer.from(img.d.buffer, img.d.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1); }
  const chunk = (type, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(type, 4, 'ascii'); d.copy(b, 8); b.writeUInt32BE(zlib.crc32(b.subarray(4, 8 + d.length)) >>> 0, 8 + d.length); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(img.w, 0); ihdr.writeUInt32BE(img.h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
export function savePng(file, img) { fs.mkdirSync(file.replace(/[\\/][^\\/]+$/, ''), { recursive: true }); fs.writeFileSync(file, encodePng(img)); }
/** Contact sheet on a checkerboard so transparency is visible; `cells` is [{img,label}]. */
export function contactSheet(cells, cols, scale = 3, pad = 6) {
  const cw = Math.max(...cells.map(c => c.img.w)) * scale + pad, ch = Math.max(...cells.map(c => c.img.h)) * scale + pad, rows = Math.ceil(cells.length / cols);
  const sheet = new Img(cw * cols, ch * rows);
  for (let y = 0; y < sheet.h; y++) for (let x = 0; x < sheet.w; x++) { const v = ((x >> 3) + (y >> 3)) & 1 ? 74 : 56; sheet.set(x, y, [v, v, v + 6, 255]); }
  cells.forEach((c, i) => { const ox = (i % cols) * cw + pad / 2, oy = Math.floor(i / cols) * ch + pad / 2; for (let y = 0; y < c.img.h * scale; y++) for (let x = 0; x < c.img.w * scale; x++) { const sx = (x / scale) | 0, sy = (y / scale) | 0; if (c.img.on(sx, sy)) sheet.set(ox + x, oy + y, c.img.get(sx, sy)); } });
  return sheet;
}
