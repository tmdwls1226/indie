import { MONSTERS } from './monsters';
import { STAGES, ZONES } from './stages';
import { itemTierForLevel } from './items';

export type QuestKind = 'kill' | 'clear' | 'level' | 'promote' | 'wins';
export interface QuestReward { gold: number; exp?: number; item?: string; }
export interface QuestDef { id: string; name: string; desc: string; kind: QuestKind; target?: string; goal: number; reward: QuestReward; }

const quests: QuestDef[] = [];
const Q = (q: QuestDef) => quests.push(q);
for (const [t, n] of [['slime', 5], ['goblin', 5], ['skeleton', 5], ['wolf', 8], ['orc', 8]] as const)
  Q({ id: `kill-${t}`, name: `${MONSTERS[t].name} 사냥`, desc: `${MONSTERS[t].name} ${n}마리를 처치하세요.`, kind: 'kill', target: t, goal: n, reward: { gold: 40 + n * 10, exp: 30 + n * 10 } });
ZONES.forEach((z, i) => {
  const boss = STAGES.find(s => s.zoneId === z.id && s.boss)!;
  Q({ id: `clear-${boss.id}`, name: `${z.name} 정복`, desc: `${z.name}의 보스를 쓰러뜨리세요.`, kind: 'clear', target: boss.id, goal: 1, reward: { gold: 150 + i * 250, exp: 150 + i * 350, item: `accessory_amulet_${itemTierForLevel(z.maxLv)}` } });
});
for (const lv of [10, 30, 50, 70, 100]) Q({ id: `level-${lv}`, name: `레벨 ${lv} 달성`, desc: `영웅 한 명이 Lv.${lv}에 도달하세요.`, kind: 'level', goal: lv, reward: { gold: lv * 12 } });
for (let t = 1; t <= 4; t++) Q({ id: `promote-${t}`, name: `${t === 4 ? '최종' : `${t}차`} 전직`, desc: `영웅 한 명이 ${t === 4 ? '최종' : `${t}차`} 전직을 완료하세요.`, kind: 'promote', goal: t, reward: { gold: t * 300, exp: t * 200 } });
for (const n of [10, 50, 150]) Q({ id: `wins-${n}`, name: `${n}번의 승리`, desc: `전투에서 ${n}번 승리하세요.`, kind: 'wins', goal: n, reward: { gold: n * 8 } });
export const QUESTS = quests;
export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(quests.map(q => [q.id, q]));
