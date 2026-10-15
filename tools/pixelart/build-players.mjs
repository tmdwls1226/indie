// node tools/pixelart/build-players.mjs <package-root>
// Writes every player frame as its own transparent PNG into <package-root>/01_Characters/<name>/.
import path from 'node:path';
import fs from 'node:fs';
import { savePng, contactSheet } from './lib.mjs';
import { CHARACTERS, W, H } from './players.mjs';
import { frames, lying, lyingPose } from './anims.mjs';

const root = process.argv[2];
if (!root) { console.error('usage: node tools/pixelart/build-players.mjs <package-root>'); process.exit(1); }
const FILE_STATE = { idle: 'idle', walk: 'walk', attack: 'attack', skill: 'skill', hurt: 'hurt', dead: 'dead' };
const written = [], preview = [], problems = [];

for (const [name, draw] of Object.entries(CHARACTERS)) {
  const anims = frames(name);
  for (const [state, list] of Object.entries(anims)) {
    
    list.forEach((p, i) => {
      const img = p === 'lying' ? lying(draw(lyingPose(name))) : draw(p);
      const file = path.join(root, '01_Characters', name, `${name}_${FILE_STATE[state]}_${String(i + 1).padStart(2, '0')}.png`);
      const b = img.bbox();
      // QA: nothing may touch the canvas edge (guide: 2-4 px margin), and the frame must not be empty
      if (!b) problems.push(`${path.basename(file)}: empty`);
      else if (b.x0 < 2 || b.y0 < 2 || b.x1 > W - 3 || b.y1 > H - 3) problems.push(`${path.basename(file)}: content within 2px of the edge (bbox ${b.x0},${b.y0}-${b.x1},${b.y1})`);
      savePng(file, img);
      written.push({ character: name, state, frame: i + 1, file: path.relative(root, file).replaceAll('\\', '/'), size: `${W}x${H}`, bbox: b });
      preview.push({ img, label: path.basename(file) });
    });
  }
}
fs.mkdirSync(path.join(root, '07_Reports'), { recursive: true });
savePng(path.join(root, '07_Reports', 'preview_players.png'), contactSheet(preview, 12, 3, 4));
fs.writeFileSync(path.join(root, '07_Reports', 'players_written.json'), JSON.stringify({ canvas: `${W}x${H}`, files: written }, null, 1));
console.log(`wrote ${written.length} PNG files (${W}x${H}, transparent)`);
if (problems.length) { console.log('QA problems:'); problems.forEach(p => console.log('  - ' + p)); } else console.log('QA: no frame touches the canvas edge');
