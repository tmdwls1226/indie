import { PROMOTION_LEVELS } from './jobs';

export interface EnemySpawn { t: string; l: number; }
export interface StageDef {
  id: string; name: string; zoneId: string; zoneName: string; index: number; enemies: EnemySpawn[];
  boss: boolean; recommendedLevel: number; trialTier?: number;
}
// One chapter per zone. `id` doubles as the background asset folder (public/assets/backgrounds/<id>/battle.png).
export interface ZoneDef { id: string; chapter: number; name: string; sub: string; minLv: number; maxLv: number; normal: number; pool: string[]; boss: string; }
export const TOWN_BG = 'ashbell';
export const TOWN_NAME = '애쉬벨 마을';
export const ZONES: ZoneDef[] = [
  { id: 'crypt', chapter: 1, name: '납골당', sub: '죽은 자들이 잠든 지하 묘지, 종소리가 울린다', minLv: 1, maxLv: 10, normal: 8, pool: ['slime', 'goblin', 'skeleton', 'skeleton_archer', 'bat'], boss: 'bell_keeper' },
  { id: 'black_forest', chapter: 2, name: '검은숲', sub: '빛이 닿지 않는 숲, 이름을 잃은 기사가 떠돈다', minLv: 11, maxLv: 30, normal: 10, pool: ['wolf', 'spider', 'mushroom', 'goblin', 'orc', 'bat'], boss: 'forgotten_knight' },
  { id: 'belkar', chapter: 3, name: '마도 도시 벨카르', sub: '마력이 폭주한 폐허의 도시', minLv: 31, maxLv: 70, normal: 12, pool: ['dark_mage', 'golem', 'wraith', 'skeleton_archer', 'spider'], boss: 'mage_doll' },
  { id: 'morgas', chapter: 4, name: '왕도 모르가스', sub: '멈춘 시간 속에서 명령만 반복되는 왕도', minLv: 71, maxLv: 90, normal: 8, pool: ['skeleton', 'orc', 'golem', 'wraith', 'dark_mage'], boss: 'time_regent' },
  { id: 'arca', chapter: 5, name: '시간의 심장 아르카', sub: '모든 시간이 멈춘 최후의 던전', minLv: 91, maxLv: 100, normal: 6, pool: ['demon', 'wraith', 'golem', 'dark_mage'], boss: 'still_lord' }
];

function buildStages(): StageDef[] {
  const out: StageDef[] = [];
  ZONES.forEach(z => {
    for (let i = 0; i <= z.normal; i++) {
      const boss = i === z.normal;
      const level = Math.round(z.minLv + (z.maxLv - z.minLv) * (i / z.normal));
      // Deterministic composition: rotate through the zone's monster pool so each battle differs.
      const pick = (k: number) => z.pool[(i * 2 + k) % z.pool.length];
      const enemies: EnemySpawn[] = boss
        ? [{ t: pick(0), l: Math.max(1, level - 1) }, { t: z.boss, l: level }, { t: pick(1), l: Math.max(1, level - 1) }]
        : [{ t: pick(0), l: level }, { t: pick(1), l: level }, { t: pick(2), l: level }];
      out.push({ id: `${z.id}-${i + 1}`, name: boss ? `${z.name} · 보스` : `${z.name} ${i + 1}`, zoneId: z.id, zoneName: z.name, index: out.length, enemies, boss, recommendedLevel: level });
    }
  });
  return out;
}
export const STAGES: StageDef[] = buildStages();
export const STAGE_BY_ID: Record<string, StageDef> = Object.fromEntries(STAGES.map(s => [s.id, s]));
export const ZONE_BY_ID: Record<string, ZoneDef> = Object.fromEntries(ZONES.map(z => [z.id, z]));

const TRIAL_BOSSES = ['trial_sentinel', 'trial_warden', 'trial_judge', 'trial_god'];
const TRIAL_NAMES = ['1차 전직 시험', '2차 전직 시험', '3차 전직 시험', '최종 전직 시험'];
export const TRIALS: StageDef[] = PROMOTION_LEVELS.map((lv, i) => ({
  id: `trial-${i + 1}`, name: TRIAL_NAMES[i], zoneId: 'trial', zoneName: '전직 시험', index: 1000 + i, boss: true, recommendedLevel: lv, trialTier: i + 1,
  enemies: [{ t: ['slime', 'wolf', 'wraith', 'demon'][i], l: lv }, { t: TRIAL_BOSSES[i], l: lv }, { t: ['goblin', 'spider', 'dark_mage', 'golem'][i], l: lv }]
}));
for (const t of TRIALS) STAGE_BY_ID[t.id] = t;
export const firstStageId = STAGES[0].id;
export const nextStageId = (id: string) => { const s = STAGE_BY_ID[id]; return s && s.trialTier === undefined ? STAGES[s.index + 1]?.id : undefined; };
// Background folder for a stage: its chapter zone, or the town for trials fought in the hub.
export const backgroundFor = (stage: StageDef) => (stage.trialTier !== undefined ? TOWN_BG : stage.zoneId);
