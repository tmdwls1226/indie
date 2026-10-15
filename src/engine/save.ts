import type { BattleLogEntry, BattlePhase, BattleState, Fighter, Hero, PlannedAction, Progress, RewardSummary, Status, StatusType } from './types';
import { CLASS_BASE, JOBS, LEVEL_CAP } from '../data/jobs';
import { ITEMS } from '../data/items';
import { SKILLS } from '../data/skills';
import { QUEST_BY_ID } from '../data/quests';
import { STAGE_BY_ID } from '../data/stages';
import { createInitialProgress, learnedSkills, levelCap, skillSlots } from './progression';

// Single-player persistence. The storage layer is isolated here so a server-backed store can replace it for online play.
export const SAVE_VERSION = 2;
const MAIN_KEY = 'turnbound:save';
const BACKUP_KEY = 'turnbound:save:backup';
const MAX_LOGS = 150;

export interface Session { id: number; stageId: string; battle: BattleState; pending: PlannedAction[]; reward?: RewardSummary; }
export type Speed = 'slow' | 'normal' | 'fast' | 'instant';
export interface Settings { speed: Speed; }
export const DEFAULT_SETTINGS: Settings = { speed: 'normal' };
export interface SaveData { version: number; savedAt: number; screen: 'town' | 'battle'; progress: Progress; session: Session | null; settings: Settings; }
export type LoadSource = 'main' | 'backup' | 'none';
export interface LoadResult { data: SaveData | null; source: LoadSource; mainDamaged: boolean; migrated: boolean; }
// Stored as {v, sum, body}: the checksum detects truncated or hand-edited data so the backup can take over.
interface Envelope { v: number; sum: string; body: string; }

function checksum(text: string): string { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16); }
function readKey(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
function writeKey(key: string, value: string): boolean { try { localStorage.setItem(key, value); return true; } catch { return false; } }
function removeKey(key: string) { try { localStorage.removeItem(key); } catch { /* storage unavailable */ } }

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isInt = (v: unknown, min = 0): v is number => isNum(v) && Number.isInteger(v) && v >= min;
const PHASES: BattlePhase[] = ['planning', 'resolving', 'victory', 'defeat'];
const ACTIONS = ['attack', 'skill', 'defend', 'item'];
const STATUS_TYPES: StatusType[] = ['burn', 'freeze', 'stun', 'slow', 'haste', 'atkUp', 'atkDown', 'defUp', 'defDown', 'taunt', 'regen', 'barrier', 'invuln', 'counter', 'reduce', 'mark'];

function sanitizeFighter(raw: any): Fighter | null {
  if (!raw || typeof raw !== 'object' || !isStr(raw.id) || !isStr(raw.name) || !isStr(raw.job)) return null;
  if (raw.side !== 'ally' && raw.side !== 'enemy') return null;
  if (![raw.hp, raw.maxHp, raw.mp, raw.maxMp, raw.atk, raw.def, raw.spd, raw.level].every(isNum) || raw.maxHp <= 0) return null;
  const hp = Math.max(0, Math.min(raw.maxHp, raw.hp));
  const statuses: Status[] = Array.isArray(raw.statuses) ? raw.statuses.filter((s: any) => s && STATUS_TYPES.includes(s.type) && isNum(s.turns) && isNum(s.value)).map((s: any) => ({ type: s.type, turns: s.turns, value: s.value })) : [];
  const cooldowns: Record<string, number> = {};
  if (raw.cooldowns && typeof raw.cooldowns === 'object') for (const [k, v] of Object.entries(raw.cooldowns)) if (SKILLS[k] && isNum(v) && v > 0) cooldowns[k] = v;
  return {
    id: raw.id, name: raw.name, job: raw.job, side: raw.side, hp, maxHp: raw.maxHp, mp: Math.max(0, Math.min(raw.maxMp, raw.mp)), maxMp: raw.maxMp,
    atk: raw.atk, def: raw.def, spd: raw.spd, alive: hp > 0, defending: false, acted: false, emoji: String(raw.emoji ?? ''), description: String(raw.description ?? ''),
    level: raw.level, skills: Array.isArray(raw.skills) ? raw.skills.filter((s: unknown) => isStr(s) && SKILLS[s]) : [], cooldowns, statuses: hp > 0 ? statuses : [],
    heroId: isStr(raw.heroId) ? raw.heroId : undefined, templateId: isStr(raw.templateId) ? raw.templateId : undefined, boss: raw.boss === true ? true : undefined
  };
}
function sanitizeBattle(raw: any): BattleState | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.fighters) || !Array.isArray(raw.logs)) return null;
  const fighters = raw.fighters.map(sanitizeFighter);
  if (!fighters.length || fighters.some((f: Fighter | null) => !f)) return null;
  if (!fighters.some((f: Fighter) => f.side === 'ally') || !fighters.some((f: Fighter) => f.side === 'enemy')) return null;
  if (!PHASES.includes(raw.phase) || !isNum(raw.round) || !isNum(raw.potions) || !isStr(raw.selectedId) || !isNum(raw.nextLogId) || !isNum(raw.rng)) return null;
  const logs: BattleLogEntry[] = raw.logs.filter((l: any) => l && isNum(l.id) && isStr(l.text)).slice(-MAX_LOGS)
    .map((l: any) => ({ id: l.id, text: l.text, kind: l.kind === 'damage' || l.kind === 'heal' || l.kind === 'system' || l.kind === 'status' ? l.kind : undefined }));
  // 'resolving' is never a resting state: rounds resolve atomically, so reopening mid-resolve means planning.
  return { fighters, round: Math.max(1, Math.floor(raw.round)), phase: raw.phase === 'resolving' ? 'planning' : raw.phase, logs, potions: Math.max(0, Math.floor(raw.potions)), selectedId: raw.selectedId, nextLogId: raw.nextLogId, rng: raw.rng >>> 0, nextPopupKey: isNum(raw.nextPopupKey) ? raw.nextPopupKey : 1 };
}
function sanitizeHero(raw: any): Hero | null {
  if (!raw || !isStr(raw.id) || !isStr(raw.name) || !(raw.baseClass in CLASS_BASE) || !isStr(raw.jobId)) return null;
  const job = JOBS[raw.jobId]; if (!job || job.baseClass !== raw.baseClass || !isNum(raw.level) || !isNum(raw.exp)) return null;
  const hero: Hero = { id: raw.id, name: raw.name, baseClass: raw.baseClass, jobId: raw.jobId, level: 1, exp: Math.max(0, raw.exp), equipment: {}, loadout: [], emoji: String(raw.emoji ?? CLASS_BASE[raw.baseClass as keyof typeof CLASS_BASE].emoji) };
  hero.level = Math.max(1, Math.min(levelCap(hero), Math.min(LEVEL_CAP, Math.floor(raw.level))));
  for (const slot of ['weapon', 'armor', 'accessory'] as const) { const id = raw.equipment?.[slot]; if (isStr(id) && ITEMS[id]?.slot === slot) hero.equipment[slot] = id; }
  const learned = learnedSkills(hero);
  hero.loadout = Array.isArray(raw.loadout) ? [...new Set<string>(raw.loadout.filter((s: unknown): s is string => isStr(s) && learned.includes(s)))].slice(0, skillSlots(hero)) : [];
  if (!hero.loadout.length) hero.loadout = [learned[0]];
  return hero;
}
function sanitizeProgress(raw: any): Progress | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.heroes) || !raw.heroes.length) return null;
  const heroes = raw.heroes.map(sanitizeHero); if (heroes.some((h: Hero | null) => !h)) return null;
  const inventory: Record<string, number> = {};
  if (raw.inventory && typeof raw.inventory === 'object') for (const [k, v] of Object.entries(raw.inventory)) if (ITEMS[k] && isInt(v, 1)) inventory[k] = v as number;
  const clearedStages: Record<string, number> = {};
  if (raw.clearedStages && typeof raw.clearedStages === 'object') for (const [k, v] of Object.entries(raw.clearedStages)) if (STAGE_BY_ID[k] && isInt(v, 1)) clearedStages[k] = v as number;
  const quests: Progress['quests'] = {};
  if (raw.quests && typeof raw.quests === 'object') for (const [k, v] of Object.entries<any>(raw.quests)) if (QUEST_BY_ID[k] && v && isInt(v.progress) && typeof v.claimed === 'boolean') quests[k] = { progress: v.progress, claimed: v.claimed };
  const trials = Array.isArray(raw.trialsCleared) ? [...new Set<number>(raw.trialsCleared.filter((t: unknown) => isInt(t, 1) && (t as number) <= 4))] : [];
  return { heroes, gold: isInt(raw.gold) ? raw.gold : 0, inventory, clearedStages, trialsCleared: trials, quests, battlesWon: isInt(raw.battlesWon) ? raw.battlesWon : 0, battlesLost: isInt(raw.battlesLost) ? raw.battlesLost : 0 };
}
function sanitizeReward(raw: any): RewardSummary | undefined {
  if (!raw || typeof raw !== 'object' || typeof raw.victory !== 'boolean' || !isStr(raw.stageId) || !isNum(raw.exp) || !isNum(raw.gold)) return undefined;
  const strs = (a: unknown) => (Array.isArray(a) ? a.filter(isStr) : []);
  return {
    victory: raw.victory, stageId: raw.stageId, exp: raw.exp, gold: raw.gold, drops: strs(raw.drops).filter(d => ITEMS[d]), capped: strs(raw.capped), questsCompleted: strs(raw.questsCompleted),
    levelUps: Array.isArray(raw.levelUps) ? raw.levelUps.filter((l: any) => l && isStr(l.name) && isNum(l.from) && isNum(l.to) && isStr(l.heroId)) : [],
    trialTier: isInt(raw.trialTier, 1) ? raw.trialTier : undefined, newlyUnlockedStage: isStr(raw.newlyUnlockedStage) && STAGE_BY_ID[raw.newlyUnlockedStage] ? raw.newlyUnlockedStage : undefined
  };
}
function sanitizeSession(raw: any): Session | null {
  if (!raw || typeof raw !== 'object' || !isStr(raw.stageId) || !STAGE_BY_ID[raw.stageId]) return null;
  const battle = sanitizeBattle(raw.battle); if (!battle) return null;
  const pending: PlannedAction[] = battle.phase !== 'planning' || !Array.isArray(raw.pending) ? [] : raw.pending
    .filter((p: any) => p && isStr(p.actorId) && ACTIONS.includes(p.type) && (p.targetId === undefined || isStr(p.targetId)) && (p.skillId === undefined || (isStr(p.skillId) && SKILLS[p.skillId])))
    .filter((p: any) => battle.fighters.some(f => f.id === p.actorId && f.side === 'ally' && f.alive))
    .map((p: any) => ({ actorId: p.actorId, type: p.type, targetId: p.targetId, skillId: p.skillId }));
  return { id: isNum(raw.id) ? raw.id : 0, stageId: raw.stageId, battle, pending, reward: sanitizeReward(raw.reward) };
}
function sanitizeSave(raw: any): { data: SaveData; migrated: boolean } | null {
  if (!raw || typeof raw !== 'object' || !isNum(raw.savedAt)) return null;
  if (raw.version === 1) {
    // v1 only stored one prototype battle with no growth data; start the new progression from scratch.
    return { migrated: true, data: { version: SAVE_VERSION, savedAt: raw.savedAt, screen: 'town', progress: createInitialProgress(), session: null, settings: { ...DEFAULT_SETTINGS } } };
  }
  if (raw.version !== SAVE_VERSION) return null;
  const progress = sanitizeProgress(raw.progress); if (!progress) return null;
  const session = raw.session ? sanitizeSession(raw.session) : null;
  const speed: Speed = ['slow', 'normal', 'fast', 'instant'].includes(raw.settings?.speed) ? raw.settings.speed : DEFAULT_SETTINGS.speed;
  return { migrated: false, data: { version: SAVE_VERSION, savedAt: raw.savedAt, screen: raw.screen === 'battle' && session ? 'battle' : 'town', progress, session, settings: { speed } } };
}
function decode(text: string | null): { data: SaveData; migrated: boolean } | null {
  if (!text) return null;
  try {
    const env = JSON.parse(text) as Envelope;
    if (!env || (env.v !== 1 && env.v !== SAVE_VERSION) || typeof env.body !== 'string' || checksum(env.body) !== env.sum) return null;
    return sanitizeSave(JSON.parse(env.body));
  } catch { return null; }
}
function encode(data: SaveData): string { const body = JSON.stringify(data); return JSON.stringify({ v: SAVE_VERSION, sum: checksum(body), body } satisfies Envelope); }

export function saveGame(state: Omit<SaveData, 'version' | 'savedAt'>, now = Date.now()): boolean {
  const session = state.session ? { ...state.session, battle: { ...state.session.battle, logs: state.session.battle.logs.slice(-MAX_LOGS) } } : null;
  const data: SaveData = { version: SAVE_VERSION, savedAt: now, ...state, session };
  // Only a readable current save may become the backup, so a damaged write never replaces a good backup.
  const previous = readKey(MAIN_KEY); if (previous && decode(previous)) writeKey(BACKUP_KEY, previous);
  return writeKey(MAIN_KEY, encode(data));
}
export function loadGame(): LoadResult {
  const mainText = readKey(MAIN_KEY); const main = decode(mainText);
  if (main) return { data: main.data, source: 'main', mainDamaged: false, migrated: main.migrated };
  const backup = decode(readKey(BACKUP_KEY));
  if (backup) return { data: backup.data, source: 'backup', mainDamaged: mainText !== null, migrated: backup.migrated };
  return { data: null, source: 'none', mainDamaged: mainText !== null, migrated: false };
}
export function loadBackup(): SaveData | null { return decode(readKey(BACKUP_KEY))?.data ?? null; }
export function clearSave() { removeKey(MAIN_KEY); removeKey(BACKUP_KEY); }
