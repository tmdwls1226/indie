export type BaseClass = 'warrior' | 'mage' | 'cleric';
export type Side = 'ally' | 'enemy';
export type ActionType = 'attack' | 'skill' | 'defend' | 'item';
export type BattlePhase = 'planning' | 'resolving' | 'victory' | 'defeat';
export type StatusType = 'burn' | 'freeze' | 'stun' | 'slow' | 'haste' | 'atkUp' | 'atkDown' | 'defUp' | 'defDown'
  | 'taunt' | 'regen' | 'barrier' | 'invuln' | 'counter' | 'reduce' | 'mark';
export interface Status { type: StatusType; turns: number; value: number; }

export interface Fighter {
  id: string; name: string; job: string; side: Side;
  hp: number; maxHp: number; mp: number; maxMp: number; atk: number; def: number; spd: number;
  alive: boolean; defending?: boolean; acted?: boolean;
  emoji: string; description: string;
  level: number; skills: string[]; cooldowns: Record<string, number>; statuses: Status[];
  heroId?: string; templateId?: string; boss?: boolean;
}
export interface BattleLogEntry { id: number; text: string; kind?: 'damage' | 'heal' | 'system' | 'status'; }
export type PopupKind = 'damage' | 'crit' | 'heal' | 'status' | 'block';
export interface Popup { key: number; targetId: string; text: string; kind: PopupKind; }
export interface Banner { title: string; sub: string; }
export interface BattleState {
  fighters: Fighter[]; round: number; phase: BattlePhase; logs: BattleLogEntry[]; potions: number;
  selectedId: string; animation?: string; nextLogId: number; rng: number;
  popups?: Popup[]; banner?: Banner; nextPopupKey: number;
}
export interface PlannedAction { actorId: string; type: ActionType; targetId?: string; skillId?: string; }
// One visible beat of a resolved round; the UI plays these back one at a time (or skips straight to the end).
export interface BattleStep { fighters: Fighter[]; logs: BattleLogEntry[]; popups: Popup[]; animation?: string; banner?: Banner; potions: number; }
export interface RoundResult { state: BattleState; steps: BattleStep[]; }

// ----- persistent progression -----
export interface Equipment { weapon?: string; armor?: string; accessory?: string; }
export interface Hero {
  id: string; name: string; baseClass: BaseClass; jobId: string; level: number; exp: number;
  equipment: Equipment; loadout: string[]; emoji: string;
}
export interface QuestProgress { progress: number; claimed: boolean; }
export interface Progress {
  heroes: Hero[]; gold: number; inventory: Record<string, number>;
  clearedStages: Record<string, number>; trialsCleared: number[];
  quests: Record<string, QuestProgress>; battlesWon: number; battlesLost: number;
}
export interface LevelUpInfo { heroId: string; name: string; from: number; to: number; }
export interface RewardSummary {
  victory: boolean; stageId: string; exp: number; gold: number; drops: string[];
  levelUps: LevelUpInfo[]; capped: string[]; trialTier?: number; questsCompleted: string[]; newlyUnlockedStage?: string;
}
