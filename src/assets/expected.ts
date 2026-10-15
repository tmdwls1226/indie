import { MONSTERS } from '../data/monsters';
import { SKILLS, STATUS_LABEL } from '../data/skills';
import { TOWN_BG, ZONES } from '../data/stages';
import { HERO_FILE } from './assets';

// The list of art the game knows how to display, with the priority used by the image guide (P0 = first playable build).
export type Priority = 'P0' | 'P1' | 'P2';
export interface ExpectedAsset { group: string; stem: string; priority: Priority; }

export function expectedAssets(): ExpectedAsset[] {
  const out: ExpectedAsset[] = [];
  const add = (group: string, stem: string, priority: Priority) => out.push({ group, stem, priority });
  for (const id of Object.values(HERO_FILE)) {
    for (const s of ['idle', 'attack', 'hit', 'down', 'portrait']) add('영웅', `characters/${id}/${id}_${s}`, 'P0');
    add('영웅', `characters/${id}/${id}_skill`, 'P1');
  }
  const early = new Set(['slime', 'goblin', 'skeleton']);
  const chapterBosses = ZONES.map(z => z.boss);
  for (const m of Object.values(MONSTERS)) {
    if (m.boss) {
      const pr: Priority = m.id === 'bell_keeper' ? 'P0' : m.id === 'still_lord' || m.id.startsWith('trial_') ? 'P2' : 'P1';
      add(chapterBosses.includes(m.id) ? '보스' : '시험 보스', `bosses/${m.id}/${m.id}_idle`, pr);
      if (pr === 'P0') for (const s of ['attack', 'hit']) add('보스', `bosses/${m.id}/${m.id}_${s}`, 'P0');
    } else {
      add('몬스터', `monsters/${m.id}/${m.id}_idle`, early.has(m.id) ? 'P0' : 'P1');
      for (const s of ['attack', 'hit', 'down']) add('몬스터', `monsters/${m.id}/${m.id}_${s}`, early.has(m.id) ? 'P0' : 'P1');
    }
  }
  add('배경', `backgrounds/${TOWN_BG}/town`, 'P1');
  for (const z of ZONES) add('배경', `backgrounds/${z.id}/battle`, z.chapter <= 2 ? 'P1' : 'P2');
  for (const c of ['attack', 'skill', 'defend', 'item']) add('아이콘', `ui/icons/cmd_${c}`, 'P0');
  for (const t of Object.keys(STATUS_LABEL)) add('상태 이상 아이콘', `ui/icons/status_${t}`, 'P1');
  for (const id of Object.keys(SKILLS).filter(k => !k.startsWith('m_'))) add('스킬 아이콘', `ui/icons/skill_${id}`, 'P1');
  for (const s of ['weapon', 'armor', 'accessory']) add('아이템 아이콘', `ui/icons/slot_${s}`, 'P2');
  return out;
}
