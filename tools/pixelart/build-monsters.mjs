// node tools/pixelart/build-monsters.mjs <package-root>
// Writes every monster frame as its own transparent PNG into <package-root>/02_Monsters/<id>/.
import path from 'node:path';
import fs from 'node:fs';
import { savePng, contactSheet } from './lib.mjs';
import { MW, MH } from './monsters.mjs';
import { MONSTER_ANIMS } from './monster-anims.mjs';

const root = process.argv[2];
if (!root) { console.error('usage: node tools/pixelart/build-monsters.mjs <package-root>'); process.exit(1); }
const only = process.argv[3] ? process.argv[3].split(',') : null;
const written = [], preview = [], problems = [];
for (const [id, anims] of Object.entries(MONSTER_ANIMS)) {
  if (only && !only.includes(id)) continue;
  for (const [state, list] of Object.entries(anims)) {
    list.forEach((make, i) => {
      const img = make();
      const file = path.join(root, '02_Monsters', id, `${id}_${state}_${String(i + 1).padStart(2, '0')}.png`);
      const b = img.bbox();
      if (!b) problems.push(`${path.basename(file)}: empty`);
      else if (b.x0 < 2 || b.y0 < 2 || b.x1 > MW - 3 || b.y1 > MH - 3) problems.push(`${path.basename(file)}: content within 2px of the edge (bbox ${b.x0},${b.y0}-${b.x1},${b.y1})`);
      savePng(file, img);
      written.push({ monster: id, state, frame: i + 1, file: path.relative(root, file).replaceAll('\\', '/'), size: `${MW}x${MH}`, bbox: b });
      preview.push({ img, label: path.basename(file) });
    });
  }
}
fs.mkdirSync(path.join(root, '07_Reports'), { recursive: true });
savePng(path.join(root, '07_Reports', 'preview_monsters.png'), contactSheet(preview, 17, 2, 4));
fs.writeFileSync(path.join(root, '07_Reports', 'monsters_written.json'), JSON.stringify({ canvas: `${MW}x${MH}`, files: written }, null, 1));
console.log(`wrote ${written.length} PNG files (${MW}x${MH}, transparent)`);
if (problems.length) { console.log('QA problems:'); problems.forEach(p => console.log('  - ' + p)); } else console.log('QA: no frame touches the canvas edge');
