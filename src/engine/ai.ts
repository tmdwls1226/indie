import type { BattleState, Fighter, PlannedAction, StatusType } from './types';
import { SKILLS, type Skill } from '../data/skills';
import { JOBS } from '../data/jobs';
import { getStatus, hpRatio, resolveTargets, skillUsable } from './battleEngine';

const living = (fs: Fighter[], side: Fighter['side']) => fs.filter(f => f.side === side && f.alive);
const isHeal = (s: Skill) => !!(s.heal || s.healPct) && s.target !== 'deadAlly';
const isBuff = (s: Skill) => !s.power && !s.heal && !s.healPct && !!s.effects && (s.target === 'self' || s.target === 'allAllies');
const CHAIN_VALUE = 0.55;
// What earlier heroes in the same round already committed to, so the party doesn't stack heals or duplicate buffs.
interface Plan { healed: Set<string>; groupHealed: boolean; buffs: Set<StatusType>; potions: number; }

function planOne(state: BattleState, actorId: string, ctx: Plan): PlannedAction {
  const actor = state.fighters.find(f => f.id === actorId)!;
  const allies = living(state.fighters, 'ally'), foes = living(state.fighters, 'enemy');
  const usable = actor.skills.map(id => SKILLS[id]).filter((s): s is Skill => !!s && !skillUsable(actor, s) && resolveTargets(state, actor, s).length > 0);
  const act = (s: Skill, targetId?: string): PlannedAction => ({ actorId, type: 'skill', skillId: s.id, targetId });
  const needsHeal = (a: Fighter) => !ctx.groupHealed && !ctx.healed.has(a.id);
  const hurt = allies.filter(a => hpRatio(a) < 0.5 && needsHeal(a));
  const weakAlly = hurt.slice().sort((a, b) => hpRatio(a) - hpRatio(b))[0];

  const revive = usable.find(s => s.target === 'deadAlly');
  if (revive && state.fighters.some(f => f.side === 'ally' && !f.alive)) return act(revive);
  if (hurt.length) {
    const wounded = allies.filter(a => hpRatio(a) < 0.7 && needsHeal(a)).length;
    const group = usable.find(s => isHeal(s) && s.target === 'allAllies');
    if (group && wounded >= 2) { ctx.groupHealed = true; return act(group); }
    const single = usable.filter(s => isHeal(s) && s.target === 'ally').sort((a, b) => (b.heal ?? 0) - (a.heal ?? 0))[0];
    if (single) { ctx.healed.add(weakAlly.id); return act(single, weakAlly.id); }
    if (group) { ctx.groupHealed = true; return act(group); }
    // Potions are a last resort: only when nobody in the party can cast a heal this turn.
    const healerAvailable = allies.some(a => a.id !== actorId && a.skills.some(id => { const s = SKILLS[id]; return s && isHeal(s) && !skillUsable(a, s); }));
    if (!healerAvailable && state.potions - ctx.potions > 0 && hpRatio(weakAlly) < 0.35) { ctx.potions++; ctx.healed.add(weakAlly.id); return { actorId, type: 'item', targetId: weakAlly.id }; }
  }
  for (const b of usable.filter(isBuff)) {
    const recipients = b.target === 'self' ? [actor] : allies;
    const wanted = b.effects!.filter(e => recipients.some(r => !getStatus(r, e.status)) && !ctx.buffs.has(e.status));
    if (wanted.length && foes.length >= 2 && actor.mp >= b.mp * 1.5) { wanted.forEach(e => ctx.buffs.add(e.status)); return act(b); }
  }
  // Healers keep MP in reserve for the next heal.
  const reserve = JOBS[actor.job]?.baseClass === 'cleric' ? 12 + actor.maxMp * 0.2 : 0;
  const alive = Math.min(3, foes.length);
  const score = (s: Skill) => {
    let p = (s.power ?? 0) * (s.hits ?? 1);
    if (s.target === 'allEnemies') p *= alive * 0.85;
    if (s.chain) p *= 1 + Math.min(s.chain, alive - 1) * CHAIN_VALUE;
    if (s.effects?.some(e => e.status === 'freeze' || e.status === 'stun')) p *= 1.15;
    return p;
  };
  const dmg = usable.filter(s => !!s.power && actor.mp - s.mp >= reserve).sort((a, b) => score(b) - score(a))[0];
  const target = foes.slice().sort((a, b) => a.hp - b.hp)[0];
  if (dmg && score(dmg) > 1.05) return act(dmg, target?.id);
  return { actorId, type: 'attack', targetId: target?.id };
}

// Heuristic player policy: used for "auto" actions on unassigned heroes, auto-battle, and the balance simulator.
// Heroes that can heal plan first so the others know what is already covered.
export function autoPlanAll(state: BattleState, actorIds: string[], reservedPotions = 0): PlannedAction[] {
  const ctx: Plan = { healed: new Set(), groupHealed: false, buffs: new Set(), potions: reservedPotions };
  const canHeal = (id: string) => state.fighters.find(f => f.id === id)?.skills.some(s => SKILLS[s] && isHeal(SKILLS[s])) ? 0 : 1;
  const plans = new Map<string, PlannedAction>();
  for (const id of [...actorIds].sort((a, b) => canHeal(a) - canHeal(b))) plans.set(id, planOne(state, id, ctx));
  return actorIds.map(id => plans.get(id)!);
}
export const autoPlan = (state: BattleState, actorId: string, reservedPotions = 0): PlannedAction => autoPlanAll(state, [actorId], reservedPotions)[0];
