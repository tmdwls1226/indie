import type { BaseClass, Equipment, Fighter, Hero, LevelUpInfo, Progress } from './types';
import { CLASS_BASE, CLASS_GROWTH, JOBS, LEVEL_CAP, SKILL_SLOTS, childJobs, gateLevel, jobPath, type JobDef } from '../data/jobs';
import { ITEMS, type ItemDef, type Slot } from '../data/items';
import { MONSTERS, monsterStats } from '../data/monsters';
import type { EnemySpawn } from '../data/stages';
import { QUESTS, QUEST_BY_ID, type QuestDef } from '../data/quests';

export interface Stats { hp: number; mp: number; atk: number; def: number; spd: number; }
export const STAT_KEYS: (keyof Stats)[] = ['hp', 'mp', 'atk', 'def', 'spd'];

export function baseStats(c: BaseClass, level: number): Stats {
  const b = CLASS_BASE[c], g = CLASS_GROWTH[c], n = level - 1;
  return { hp: b.hp + g.hp * n, mp: b.mp + g.mp * n, atk: b.atk + g.atk * n, def: b.def + g.def * n, spd: b.spd + g.spd * n };
}
export function equipmentBonus(eq: Equipment): Stats {
  const sum: Stats = { hp: 0, mp: 0, atk: 0, def: 0, spd: 0 };
  for (const id of Object.values(eq)) { const it = id ? ITEMS[id] : undefined; if (it) for (const k of STAT_KEYS) sum[k] += it.stats[k] ?? 0; }
  return sum;
}
// Final stats = (class curve at level) x (job multiplier) + equipment.
export function heroStats(hero: Hero, equipment: Equipment = hero.equipment): Stats {
  const base = baseStats(hero.baseClass, hero.level), m = JOBS[hero.jobId].mult, eq = equipmentBonus(equipment);
  const out = {} as Stats;
  for (const k of STAT_KEYS) out[k] = Math.max(1, Math.round(base[k] * m[k] + eq[k]));
  return out;
}
export const jobOf = (hero: Hero): JobDef => JOBS[hero.jobId];
export const learnedSkills = (hero: Hero): string[] => jobPath(hero.jobId).flatMap(j => j.skills);
export const skillSlots = (hero: Hero) => SKILL_SLOTS[jobOf(hero).tier];
// A hero stops levelling at the next promotion gate until promoted.
export const levelCap = (hero: Hero): number => gateLevel(jobOf(hero).tier) ?? LEVEL_CAP;
export const expToNext = (level: number) => Math.floor(40 * Math.pow(level, 1.55));

export function gainExp(hero: Hero, amount: number): { hero: Hero; levelUp?: LevelUpInfo; capped: boolean } {
  const cap = levelCap(hero); let level = hero.level, exp = hero.exp + amount;
  while (level < cap && exp >= expToNext(level)) { exp -= expToNext(level); level++; }
  const capped = level >= cap;
  if (capped) exp = Math.min(exp, 0);   // held at the gate: no banked exp while waiting for promotion
  const next = { ...hero, level, exp };
  return { hero: next, capped, levelUp: level > hero.level ? { heroId: hero.id, name: hero.name, from: hero.level, to: level } : undefined };
}
export const trialsNeeded = (hero: Hero) => jobOf(hero).tier + 1;
export const atPromotionGate = (hero: Hero) => { const gate = gateLevel(jobOf(hero).tier); return gate !== undefined && hero.level >= gate; };
export const canPromote = (hero: Hero, trialsCleared: number[]) => atPromotionGate(hero) && trialsCleared.includes(trialsNeeded(hero));
export const nextJobs = (hero: Hero): JobDef[] => childJobs(hero.jobId);
export function promote(hero: Hero, jobId: string): Hero {
  const def = JOBS[jobId]; if (!def || def.parent !== hero.jobId) return hero;
  const next: Hero = { ...hero, jobId, loadout: [...hero.loadout] };
  for (const s of def.skills) if (next.loadout.length < skillSlots(next)) next.loadout.push(s);
  return next;
}
export function toggleSkill(hero: Hero, skillId: string): Hero {
  if (!learnedSkills(hero).includes(skillId)) return hero;
  if (hero.loadout.includes(skillId)) return hero.loadout.length <= 1 ? hero : { ...hero, loadout: hero.loadout.filter(s => s !== skillId) };
  return hero.loadout.length >= skillSlots(hero) ? hero : { ...hero, loadout: [...hero.loadout, skillId] };
}

// ---- equipment ----
export function equipError(hero: Hero, item: ItemDef): string | null {
  if (item.classes && !item.classes.includes(hero.baseClass)) return '이 직업은 착용할 수 없습니다.';
  if (hero.level < item.minLevel) return `Lv.${item.minLevel} 이상 착용 가능합니다.`;
  return null;
}
export function equip(p: Progress, heroId: string, itemId: string): Progress {
  const hero = p.heroes.find(h => h.id === heroId), item = ITEMS[itemId];
  if (!hero || !item || (p.inventory[itemId] ?? 0) < 1 || equipError(hero, item)) return p;
  const inv = { ...p.inventory }; inv[itemId]--; if (inv[itemId] <= 0) delete inv[itemId];
  const old = hero.equipment[item.slot]; if (old) inv[old] = (inv[old] ?? 0) + 1;
  return { ...p, inventory: inv, heroes: p.heroes.map(h => h.id === heroId ? { ...h, equipment: { ...h.equipment, [item.slot]: itemId } } : h) };
}
export function unequip(p: Progress, heroId: string, slot: Slot): Progress {
  const hero = p.heroes.find(h => h.id === heroId), old = hero?.equipment[slot]; if (!hero || !old) return p;
  const eq = { ...hero.equipment }; delete eq[slot];
  return { ...p, inventory: { ...p.inventory, [old]: (p.inventory[old] ?? 0) + 1 }, heroes: p.heroes.map(h => h.id === heroId ? { ...h, equipment: eq } : h) };
}
export const addItem = (inv: Record<string, number>, id: string, n = 1) => ({ ...inv, [id]: (inv[id] ?? 0) + n });
export function buyItem(p: Progress, itemId: string): Progress {
  const it = ITEMS[itemId]; if (!it || p.gold < it.price) return p;
  return { ...p, gold: p.gold - it.price, inventory: addItem(p.inventory, itemId) };
}
export function sellItem(p: Progress, itemId: string, price: number): Progress {
  if ((p.inventory[itemId] ?? 0) < 1) return p;
  const inv = { ...p.inventory }; inv[itemId]--; if (inv[itemId] <= 0) delete inv[itemId];
  return { ...p, gold: p.gold + price, inventory: inv };
}

// ---- party / enemies ----
export function createHero(id: string, baseClass: BaseClass): Hero {
  return { id, name: CLASS_BASE[baseClass].name, baseClass, jobId: baseClass, level: 1, exp: 0, equipment: {}, loadout: [...JOBS[baseClass].skills], emoji: CLASS_BASE[baseClass].emoji };
}
export function createInitialProgress(): Progress {
  return { heroes: [createHero('warrior', 'warrior'), createHero('mage', 'mage'), createHero('cleric', 'cleric')], gold: 100, inventory: {}, clearedStages: {}, trialsCleared: [], quests: {}, battlesWon: 0, battlesLost: 0 };
}
export function heroToFighter(hero: Hero): Fighter {
  const s = heroStats(hero), job = jobOf(hero);
  return { id: hero.id, name: hero.name, job: hero.jobId, side: 'ally', hp: s.hp, maxHp: s.hp, mp: s.mp, maxMp: s.mp, atk: s.atk, def: s.def, spd: s.spd, alive: true, defending: false, acted: false, emoji: hero.emoji, description: job.desc, level: hero.level, skills: [...hero.loadout], cooldowns: {}, statuses: [], heroId: hero.id };
}
export function spawnEnemy(spawn: EnemySpawn, index: number): Fighter {
  const def = MONSTERS[spawn.t], s = monsterStats(def, spawn.l);
  return { id: `${def.id}-${index}`, name: def.name, job: def.id, side: 'enemy', hp: s.hp, maxHp: s.hp, mp: 0, maxMp: 0, atk: s.atk, def: s.def, spd: s.spd, alive: true, defending: false, acted: false, emoji: def.emoji, description: def.desc, level: spawn.l, skills: [...def.skills], cooldowns: {}, statuses: [], templateId: def.id, boss: def.boss };
}

// ---- rewards ----
const battlesPerLevel = (level: number) => 1 + level / 60;
export const EXP_TUNE = { exp: 1, gold: 1 };
export function enemyExp(level: number, partyLevel: number, boss: boolean): number {
  const per = expToNext(level) / battlesPerLevel(level) / 3;
  const gap = Math.min(2, Math.max(0.25, 1 + (level - partyLevel) * 0.1));
  return Math.max(1, Math.round(per * gap * (boss ? 2 : 1) * EXP_TUNE.exp));
}
export const enemyGold = (level: number, boss: boolean) => Math.round((5 + 2 * level) * (boss ? 4 : 1) * EXP_TUNE.gold);

// ---- quests ----
export function questProgress(q: QuestDef, p: Progress): number {
  switch (q.kind) {
    case 'kill': return p.quests[q.id]?.progress ?? 0;
    case 'clear': return (p.clearedStages[q.target!] ?? 0) > 0 ? 1 : 0;
    case 'level': return Math.max(...p.heroes.map(h => h.level));
    case 'promote': return Math.max(...p.heroes.map(h => jobOf(h).tier));
    case 'wins': return p.battlesWon;
  }
}
export const questDone = (q: QuestDef, p: Progress) => questProgress(q, p) >= q.goal;
export const doneQuestIds = (p: Progress) => QUESTS.filter(q => questDone(q, p)).map(q => q.id);
export function recordKills(p: Progress, templateIds: string[]): Progress {
  const quests = { ...p.quests };
  for (const q of QUESTS) if (q.kind === 'kill') {
    const n = templateIds.filter(t => t === q.target).length;
    if (n) quests[q.id] = { progress: Math.min(q.goal, (quests[q.id]?.progress ?? 0) + n), claimed: quests[q.id]?.claimed ?? false };
  }
  return { ...p, quests };
}
export function claimQuest(p: Progress, id: string): Progress {
  const q = QUEST_BY_ID[id];
  if (!q || p.quests[id]?.claimed || !questDone(q, p)) return p;
  let next: Progress = { ...p, gold: p.gold + q.reward.gold, quests: { ...p.quests, [id]: { progress: questProgress(q, p), claimed: true } } };
  if (q.reward.item) next = { ...next, inventory: addItem(next.inventory, q.reward.item) };
  if (q.reward.exp) next = { ...next, heroes: next.heroes.map(h => gainExp(h, q.reward.exp!).hero) };
  return next;
}
