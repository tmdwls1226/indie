import { contactSheet, savePng } from './lib.mjs';
import { CHARACTERS, pose } from './players.mjs';
const out = process.argv[2];
const poses = [pose({ weapon: { ang: 40, len: 20 } }), pose({ weapon: { ang: -25 }, handF: [3, 3], lean: 2, dx: 2 }), pose({ weapon: { ang: -90, len: 22, glow: 1 }, handF: [1, -4], sparks: 4 }), pose({ eyes: 'closed', mouth: 1, lean: -3, flash: 0.5 })];
const cells = [];
for (const [name, draw] of Object.entries(CHARACTERS)) for (const p of poses) {
  const q = name === 'leon' ? p : pose({ ...p, weapon: { ...p.weapon, len: name === 'leon' ? 20 : 26, ang: p.weapon.ang === 40 ? -78 : p.weapon.ang }, handF: p.weapon.ang === 40 ? [3, 6] : p.handF });
  cells.push({ img: draw(q) });
}
savePng(out, contactSheet(cells, 4, 5));
console.log('ok');
