// node tools/pixelart/report.mjs <package-root>
// Scans the package folders and writes 07_Reports/ASSET_STATUS_KO.md + asset_status.json.
// "Done" means the PNG file actually exists on disk and is a valid transparent RGBA PNG; nothing is assumed.
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2];
if (!root) { console.error('usage: node tools/pixelart/report.mjs <package-root>'); process.exit(1); }

const FPS = { idle: 4, walk: 8, move: 8, attack: 10, skill: 8, hurt: 8, hit: 8, dead: 6 };
const PLAYERS = ['leon', 'elia', 'serin'], PLAYER_STATES = ['idle', 'walk', 'attack', 'skill', 'hurt', 'dead'];
const MONSTERS = ['slime', 'goblin', 'skeleton', 'wolf', 'spider', 'orc', 'golem', 'bat'], MONSTER_STATES = ['idle', 'move', 'attack', 'hit', 'dead'];
// Boss file ids are not fixed by the package (the reference sheet and the task text disagree), so they are reported as groups.
const BOSSES = [['1장 타락한 종지기', 'corrupted_bellkeeper'], ['2장 망각의 기사', 'forgotten_knight'], ['3장 폭주한 마도 인형', 'mad_doll'], ['4장 정지의 군주(섭정 형태)', 'time_regent'], ['5장 정지의 군주(최종)', 'time_lord']];
const BOSS_STATES = ['idle', 'attack', 'skill', 'hit', 'dead'];
const BACKGROUNDS = ['ashbell_village_bg', 'dark_forest_bg', 'ruins_bg', 'ossuary_bg', 'boss_arena_bg'];
const EFFECTS = ['fx_slash', 'fx_fireball', 'fx_ice_spear', 'fx_heal', 'fx_shield', 'fx_poison', 'fx_curse', 'fx_aoe', 'fx_stun', 'fx_ultimate'];

function pngInfo(file) {
  const b = fs.readFileSync(file);
  if (b.length < 33 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), rgba: b[25] === 6 };
}
const list = dir => (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.png$/i.test(f)).sort() : []);
function framesOf(dir, id, state) { return list(dir).filter(f => new RegExp(`^${id}_${state}_\\d+\\.png$`).test(f)); }

const done = [], missing = [], sections = [];
function check(group, dir, id, states, label = id) {
  const rows = [];
  for (const st of states) {
    const files = framesOf(dir, id, st);
    if (!files.length) { missing.push({ group, asset: label, state: st, expected: `${id}_${st}_01.png` }); rows.push({ state: st, frames: 0 }); continue; }
    const infos = files.map(f => pngInfo(path.join(dir, f)));
    const sizes = [...new Set(infos.map(i => (i ? `${i.w}x${i.h}` : 'invalid')))];
    const ok = infos.every(i => i && i.rgba);
    (ok ? done : missing).push(ok ? { group, asset: label, state: st, frames: files.length, size: sizes.join(','), fps: FPS[st], files } : { group, asset: label, state: st, expected: 'valid RGBA PNG' });
    rows.push({ state: st, frames: files.length, size: sizes.join(','), fps: FPS[st] });
  }
  sections.push({ group, asset: label, rows });
}
for (const id of PLAYERS) check('플레이어', path.join(root, '01_Characters', id), id, PLAYER_STATES);
for (const id of MONSTERS) check('일반 몬스터', path.join(root, '02_Monsters', id), id, MONSTER_STATES);
for (const [label, id] of BOSSES) check('챕터 보스', path.join(root, '03_Bosses', id), id, BOSS_STATES, `${label} (${id})`);
for (const [dirName, group, names] of [['04_Backgrounds', '배경', BACKGROUNDS], ['05_Skill_Effects', '스킬 이펙트', EFFECTS]]) {
  for (const n of names) {
    const file = path.join(root, dirName, `${n}.png`);
    if (fs.existsSync(file)) { const i = pngInfo(file); done.push({ group, asset: n, state: '-', frames: 1, size: i ? `${i.w}x${i.h}` : 'invalid', files: [`${n}.png`] }); } else missing.push({ group, asset: n, state: '-', expected: `${n}.png` });
  }
}

const totalFiles = done.reduce((a, d) => a + (d.files?.length ?? 0), 0);
const md = [];
md.push('# TURNBOUND 에셋 제작 현황', '', '이 목록은 폴더를 직접 스캔해 만들었습니다. **실제로 존재하고 유효한 RGBA PNG인 파일만 완료로 표시됩니다.**', '');
md.push(`- 완료된 PNG 파일: **${totalFiles}개** (${done.length}개 상태 묶음)`, `- 누락된 항목: **${missing.length}개** 상태/파일 묶음`, '');
md.push('## 제작 방식과 한계', '',
  '- 이 에셋은 이미지 생성 모델이 아니라 **코드로 도트를 직접 찍어서** 만들었습니다(`tools/pixelart/`). 참고 시트(AI 일러스트 기반)보다 단순하고 작은 도트 스타일입니다.',
  '- 안티앨리어싱·블러 없음, 투명 배경, 캔버스 크기와 발 위치 고정(바닥선 y=75), 글자·테두리·바닥 없음.',
  '- 각 프레임은 개별 PNG이며, 코드 안의 자세 정의에서 만들어지므로 수정 후 다시 생성할 수 있습니다.', '');
md.push('## 완료 목록', '', '| 분류 | 에셋 | 상태 | 프레임 | 크기 | 권장 fps | 파일 |', '|---|---|---|---|---|---|---|');
for (const d of done) md.push(`| ${d.group} | ${d.asset} | ${d.state} | ${d.frames} | ${d.size} | ${d.fps ?? '-'} | ${d.files[0]}${d.files.length > 1 ? ` … ${d.files[d.files.length - 1]}` : ''} |`);
md.push('', '## 누락 목록 (아직 만들지 않음)', '');
const byGroup = {};
for (const m of missing) (byGroup[`${m.group} · ${m.asset}`] ??= []).push(m.expected);
for (const [k, v] of Object.entries(byGroup)) md.push(`- **${k}**: ${v.join(', ')}`);
md.push('', '## 확인이 필요한 점', '',
  '- 보스 파일명: 참고 시트(`corrupted_bellkeeper`, `mad_doll`, `time_lord`)와 지시문(4장 정지의 군주 섭정 형태 / 5장 최종 형태)이 서로 다릅니다. 게임 코드는 `bell_keeper`, `mage_doll`, `time_regent`, `still_lord`를 사용합니다. 보스 제작 전에 이름을 정해 주세요.',
  '- 세린의 파일명은 `README_KO.md`와 지시문의 `serin`을 따랐습니다(참고 시트에는 `serene`).');
fs.mkdirSync(path.join(root, '07_Reports'), { recursive: true });
fs.writeFileSync(path.join(root, '07_Reports', 'ASSET_STATUS_KO.md'), md.join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(root, '07_Reports', 'asset_status.json'), JSON.stringify({ generated: new Date().toISOString(), completed_files: totalFiles, done, missing, sections }, null, 1));
console.log(`done: ${totalFiles} PNG files in ${done.length} groups; missing: ${missing.length} groups`);
