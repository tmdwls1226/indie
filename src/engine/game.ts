import type { BattleState, Fighter, Progress, RewardSummary } from './types';
import { STAGES, STAGE_BY_ID, nextStageId, type StageDef } from '../data/stages';
import { ITEM_LIST, itemTierForLevel } from '../data/items';
import { MONSTERS } from '../data/monsters';
import { JOBS, PROMOTION_LEVELS } from '../data/jobs';
import { addItem, atPromotionGate, doneQuestIds, enemyExp, enemyGold, gainExp, recordKills } from './progression';
import { nextRandom } from './rng';

export const NORMAL_DROP_CHANCE = 0.12;

function rollDrops(enemies: Fighter[], seed: number): string[] {
  const drops: string[] = []; let rng = seed;
  const roll = () => { const r = nextRandom(rng); rng = r.seed; return r.value; };
  for (const e of enemies) {
    if (!e.boss && roll() >= NORMAL_DROP_CHANCE) continue;
    const pool = ITEM_LIST.filter(i => i.tier === itemTierForLevel(e.level) && i.rarity === (e.boss ? 'rare' : 'normal'));
    drops.push(pool[Math.floor(roll() * pool.length)].id);
  }
  return drops;
}

// Settle a finished battle into persistent progress: exp, gold, drops, clears, trials and quest completions.
export function applyBattleResult(progress: Progress, stage: StageDef, battle: BattleState): { progress: Progress; reward: RewardSummary } {
  const victory = battle.phase === 'victory';
  const empty: RewardSummary = { victory, stageId: stage.id, exp: 0, gold: 0, drops: [], levelUps: [], capped: [], questsCompleted: [] };
  if (!victory) return { progress: { ...progress, battlesLost: progress.battlesLost + 1 }, reward: empty };
  const enemies = battle.fighters.filter(f => f.side === 'enemy');
  const partyLevel = Math.round(progress.heroes.reduce((a, h) => a + h.level, 0) / progress.heroes.length);
  const exp = enemies.reduce((a, e) => a + enemyExp(e.level, partyLevel, !!e.boss), 0);
  const gold = enemies.reduce((a, e) => a + enemyGold(e.level, !!e.boss), 0);
  const drops = rollDrops(enemies, battle.rng);
  const before = new Set(doneQuestIds(progress));
  const levelUps: RewardSummary['levelUps'] = [];
  const heroes = progress.heroes.map(h => { const g = gainExp(h, exp); if (g.levelUp) levelUps.push(g.levelUp); return g.hero; });
  let next: Progress = {
    ...progress, heroes, gold: progress.gold + gold, battlesWon: progress.battlesWon + 1,
    clearedStages: { ...progress.clearedStages, [stage.id]: (progress.clearedStages[stage.id] ?? 0) + 1 },
    trialsCleared: stage.trialTier && !progress.trialsCleared.includes(stage.trialTier) ? [...progress.trialsCleared, stage.trialTier] : progress.trialsCleared
  };
  for (const d of drops) next = { ...next, inventory: addItem(next.inventory, d) };
  next = recordKills(next, enemies.map(e => e.templateId!).filter(t => t && MONSTERS[t]));
  const questsCompleted = doneQuestIds(next).filter(id => !before.has(id));
  const firstClear = !(progress.clearedStages[stage.id] > 0);
  return {
    progress: next,
    reward: { victory, stageId: stage.id, exp, gold, drops, levelUps, capped: heroes.filter(atPromotionGate).map(h => h.id), trialTier: stage.trialTier, questsCompleted, newlyUnlockedStage: firstClear ? nextStageId(stage.id) : undefined }
  };
}

// ---- stage availability ----
// A promotion trial opens when a hero stands at the matching gate level and has not passed it yet.
export function isStageUnlocked(progress: Progress, stageId: string): boolean {
  const s = STAGE_BY_ID[stageId]; if (!s) return false;
  if (s.trialTier !== undefined) {
    const tier = s.trialTier;
    return !progress.trialsCleared.includes(tier) && progress.heroes.some(h => JOBS[h.jobId].tier === tier - 1 && h.level >= PROMOTION_LEVELS[tier - 1]);
  }
  return s.index === 0 || (progress.clearedStages[STAGES[s.index - 1].id] ?? 0) > 0;
}
export const highestUnlockedStage = (progress: Progress): StageDef => STAGES.filter(s => isStageUnlocked(progress, s.id)).pop()!;
