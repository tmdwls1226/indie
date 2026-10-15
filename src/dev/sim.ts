// Headless balance simulator (dev only; not imported by the app). Run from the browser console of the dev server:
//   const sim = await import('/src/dev/sim.ts'); sim.runCampaign({...})
import type { Hero, Progress } from '../engine/types';
import { createBattle, resolveRound } from '../engine/battleEngine';
import { autoPlanAll } from '../engine/ai';
import { applyBattleResult, highestUnlockedStage, isStageUnlocked } from '../engine/game';
import { STAGES, STAGE_BY_ID, TRIALS, type StageDef } from '../data/stages';
import { JOBS, childJobs, LEVEL_CAP } from '../data/jobs';
import { ITEM_LIST, type ItemDef } from '../data/items';
import { BOSS_TUNE, LEVEL_MULT, MONSTER_CURVE, MONSTER_TUNE } from '../data/monsters';
import { EXP_TUNE, atPromotionGate, buyItem, canPromote, createInitialProgress, equip, equipError, heroStats, promote } from '../engine/progression';

export interface BattleStat { victory: boolean; rounds: number; hpLeftPct: number; downs: number; potionsUsed: number; }
export function simulateBattle(progress: Progress, stage: StageDef, seed: number): { stat: BattleStat; state: ReturnType<typeof createBattle> } {
  let s = createBattle(progress.heroes, stage, seed);
  let rounds = 0;
  while (s.phase === 'planning' && rounds < 80) {
    const acts = autoPlanAll(s, s.fighters.filter(f => f.side === 'ally' && f.alive).map(f => f.id));
    s = resolveRound(s, acts).state; rounds++;
  }
  const allies = s.fighters.filter(f => f.side === 'ally');
  return { state: s, stat: { victory: s.phase === 'victory', rounds, hpLeftPct: allies.reduce((a, f) => a + f.hp, 0) / allies.reduce((a, f) => a + f.maxHp, 0), downs: allies.filter(f => !f.alive).length, potionsUsed: 3 - s.potions } };
}

export type BranchPref = { warrior: string; mage: string; cleric: string };
const DEFAULT_PREF: BranchPref = { warrior: '공격형', mage: '화염', cleric: '공격·심판형' };
function pickJob(hero: Hero, pref: BranchPref) {
  const kids = childJobs(hero.jobId);
  return kids.find(k => k.branch === pref[hero.baseClass]) ?? kids[0];
}
// Spend gold on the best item per slot the hero can wear.
function shop(p: Progress): Progress {
  let next = p;
  for (const hero of p.heroes) for (const slot of ['weapon', 'armor', 'accessory'] as const) {
    const cur = next.heroes.find(h => h.id === hero.id)!;
    const candidates = ITEM_LIST.filter((i: ItemDef) => i.slot === slot && !equipError(cur, i) && i.price <= next.gold * 0.6);
    const owned = Object.keys(next.inventory).map(id => ITEM_LIST.find(i => i.id === id)!).filter(i => i && i.slot === slot && !equipError(cur, i));
    const best = [...candidates, ...owned].sort((a, b) => b.minLevel * (b.rarity === 'rare' ? 1.3 : 1) - a.minLevel * (a.rarity === 'rare' ? 1.3 : 1))[0];
    if (!best || cur.equipment[slot] === best.id) continue;
    const curItem = cur.equipment[slot] ? ITEM_LIST.find(i => i.id === cur.equipment[slot])! : undefined;
    if (curItem && curItem.minLevel * (curItem.rarity === 'rare' ? 1.3 : 1) >= best.minLevel * (best.rarity === 'rare' ? 1.3 : 1)) continue;
    if ((next.inventory[best.id] ?? 0) < 1) next = buyItem(next, best.id);
    next = equip(next, hero.id, best.id);
  }
  return next;
}
export interface CampaignOptions { pref?: BranchPref; maxBattles?: number; seed?: number; buy?: boolean; stopAtStage?: string; }
export interface CampaignRow { n: number; stage: string; avgLv: number; win: boolean; rounds: number; hpLeftPct: number; downs: number; gold: number; }
export function runCampaign(opts: CampaignOptions = {}) {
  const pref = opts.pref ?? DEFAULT_PREF, maxBattles = opts.maxBattles ?? 1500; let seed = opts.seed ?? 1234;
  let p = createInitialProgress(); const rows: CampaignRow[] = []; const promos: { n: number; tier: number }[] = [];
  let losses = 0;
  for (let n = 1; n <= maxBattles; n++) {
    // promote whenever a hero is eligible
    p = { ...p, heroes: p.heroes.map(h => (canPromote(h, p.trialsCleared) ? (promos.push({ n, tier: JOBS[h.jobId].tier + 1 }), promote(h, pickJob(h, pref).id)) : h)) };
    if (opts.buy !== false) p = shop(p);
    const avg = p.heroes.reduce((a, h) => a + h.level, 0) / p.heroes.length;
    const trial = TRIALS.find(t => isStageUnlocked(p, t.id));
    // stage choice: newest unlocked stage unless clearly under-levelled, in which case farm the previous one
    let stage: StageDef = trial ?? highestUnlockedStage(p);
    // After repeated defeats a sensible player steps back to farm exp and gold instead of banging on the wall.
    if (!trial) { while (stage.index > 0 && stage.recommendedLevel > avg + 2 - Math.min(losses, 8)) stage = STAGES[stage.index - 1]; }
    const sim = simulateBattle(p, stage, seed++);
    const applied = applyBattleResult(p, stage, sim.state); p = applied.progress;
    losses = sim.stat.victory ? 0 : losses + 1;
    rows.push({ n, stage: stage.id, avgLv: Math.round(avg * 10) / 10, win: sim.stat.victory, rounds: sim.stat.rounds, hpLeftPct: Math.round(sim.stat.hpLeftPct * 100), downs: sim.stat.downs, gold: p.gold });
    if (p.heroes.every(h => h.level >= LEVEL_CAP && JOBS[h.jobId].tier === 4) || (opts.stopAtStage && stage.id === opts.stopAtStage && sim.stat.victory)) break;
  }
  return { progress: p, rows, promos };
}
// Summarise campaign rows per zone / level band.
export function summarize(rows: CampaignRow[]) {
  const byStage: Record<string, { n: number; wins: number; hp: number; rounds: number }> = {};
  for (const r of rows) { const b = (byStage[r.stage] ??= { n: 0, wins: 0, hp: 0, rounds: 0 }); b.n++; b.wins += r.win ? 1 : 0; b.hp += r.hpLeftPct; b.rounds += r.rounds; }
  return Object.entries(byStage).map(([stage, b]) => `${stage}: ${b.n}회 승률${Math.round((b.wins / b.n) * 100)}% 잔여HP${Math.round(b.hp / b.n)}% ${(b.rounds / b.n).toFixed(1)}R`);
}
// A "typical" party at a given level: promoted along the default branches and fully geared with normal-tier items.
export function buildParty(level: number, pref: BranchPref = DEFAULT_PREF, gear = true): Progress {
  let p = createInitialProgress();
  p = { ...p, heroes: p.heroes.map(h => {
    let hero: Hero = { ...h, level: 1 };
    // Heroes standing exactly on a gate level are still pre-promotion (they must clear the trial first).
    for (const gate of [10, 30, 70, 100]) if (level > gate) { hero = { ...hero, level: gate }; hero = promote(hero, pickJob(hero, pref).id); }
    return { ...hero, level };
  }) };
  if (gear) {
    p = { ...p, gold: 1e9 };
    for (const hero of p.heroes) for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const cands = ITEM_LIST.filter(i => i.slot === slot && i.rarity === 'normal' && !equipError(hero, i));
      for (const i of cands.filter(c => c.minLevel === Math.max(...cands.map(x => x.minLevel))).slice(0, 1)) { p = buyItem(p, i.id); p = equip(p, hero.id, i.id); }
    }
  }
  return p;
}
export function evalAt(level: number, n = 20, o: { boss?: boolean; pref?: BranchPref; gear?: boolean; levelOffset?: number } = {}) {
  const p = buildParty(level, o.pref, o.gear);
  const zoneStages = STAGES.filter(s => s.boss === !!o.boss);
  const base = zoneStages.reduce((best, s) => Math.abs(s.recommendedLevel - level) < Math.abs(best.recommendedLevel - level) ? s : best, zoneStages[0]);
  const stage: StageDef = { ...base, enemies: base.enemies.map(e => ({ ...e, l: Math.max(1, level + (o.levelOffset ?? 0) + (e.l - base.recommendedLevel)) })) };
  let wins = 0, hp = 0, rounds = 0, downs = 0;
  for (let i = 0; i < n; i++) { const { stat } = simulateBattle(p, stage, 1000 + i * 77); wins += stat.victory ? 1 : 0; hp += stat.hpLeftPct; rounds += stat.rounds; downs += stat.downs; }
  return { level, stage: stage.id, win: Math.round((wins / n) * 100), hp: Math.round((hp / n) * 100), R: +(rounds / n).toFixed(1), downs: +(downs / n).toFixed(2) };
}
export function evalGrid(levels = [1, 3, 5, 8, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100], n = 20, o: Parameters<typeof evalAt>[2] = {}) {
  return levels.map(l => { const r = evalAt(l, n, o); return `Lv${String(l).padStart(3)} ${r.stage.padEnd(9)} win=${String(r.win).padStart(3)}% hp=${String(r.hp).padStart(3)}% R=${String(r.R).padStart(4)} down=${r.downs}`; });
}
// One line per zone: battles fought, win rate, average party HP left, average rounds, and level at the zone's end.
export function zoneSummary(rows: CampaignRow[]) {
  const zones: Record<string, CampaignRow[]> = {};
  for (const r of rows) (zones[r.stage.startsWith('trial') ? 'trial' : STAGE_BY_ID[r.stage].zoneId] ??= []).push(r);
  return Object.entries(zones).map(([z, rs]) => {
    const boss = rs.filter(r => STAGE_BY_ID[r.stage]?.boss && !r.stage.startsWith('trial'));
    return `${z.padEnd(8)} n=${String(rs.length).padStart(3)} win=${Math.round(rs.filter(r => r.win).length / rs.length * 100)}% hp=${Math.round(rs.reduce((a, r) => a + r.hpLeftPct, 0) / rs.length)}% R=${(rs.reduce((a, r) => a + r.rounds, 0) / rs.length).toFixed(1)} Lv${rs[0].avgLv}->${rs[rs.length - 1].avgLv}` + (boss.length ? ` | boss hp=${Math.round(boss.reduce((a, r) => a + r.hpLeftPct, 0) / boss.length)}% R=${(boss.reduce((a, r) => a + r.rounds, 0) / boss.length).toFixed(1)}` : '');
  });
}
// Exposed so tuning scripts mutate the exact module instances the simulator runs against
// (importing these modules separately from the console can yield a second copy after Vite HMR).
export const tune = { MONSTER_TUNE, EXP_TUNE, LEVEL_MULT, MONSTER_CURVE, BOSS_TUNE };
export { STAGE_BY_ID, heroStats, atPromotionGate };
