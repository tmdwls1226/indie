import type { BattleLogEntry, BattleState, BattleStep, Fighter, Hero, PlannedAction, PopupKind, RoundResult, Side, StatusType } from './types';
import { CHAIN_FALLOFF, CRIT_CHANCE, CRIT_MULT, DEFEND_REDUCTION, MP_REGEN_PCT, POTION_COUNT, POTION_HEAL, POTION_PCT, SKILLS, STATUS_LABEL, type EffectSpec, type Skill } from '../data/skills';
import { JOBS } from '../data/jobs';
import type { StageDef } from '../data/stages';
import { heroToFighter, spawnEnemy } from './progression';
import { josa } from './korean';
import { newSeed, nextRandom } from './rng';

export function createBattle(heroes: Hero[], stage: StageDef, seed: number = newSeed()): BattleState {
  const fighters = [...heroes.map(heroToFighter), ...stage.enemies.map((e, i) => spawnEnemy(e, i))];
  const names = stage.enemies.length;
  return {
    fighters, round: 1, phase: 'planning', potions: POTION_COUNT, selectedId: heroes[0].id, nextLogId: 3, rng: seed, nextPopupKey: 1,
    logs: [{ id: 1, text: `${stage.name} — 적 ${names}마리가 앞을 막아선다.`, kind: 'system' }, { id: 2, text: '아군의 행동을 선택하고 턴을 확정하세요.' }]
  };
}

// ---------- small helpers ----------
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const living = (fs: Fighter[], side: Side) => fs.filter(f => f.side === side && f.alive && f.hp > 0);
const other = (side: Side): Side => (side === 'ally' ? 'enemy' : 'ally');
export const hpRatio = (f: Fighter) => f.hp / f.maxHp;
export const getStatus = (f: Fighter, t: StatusType) => f.statuses.find(s => s.type === t);
const weakest = (fs: Fighter[]) => fs.slice().sort((a, b) => hpRatio(a) - hpRatio(b))[0];
function rand(s: BattleState): number { const r = nextRandom(s.rng); s.rng = r.seed; return r.value; }
function log(s: BattleState, text: string, kind?: BattleLogEntry['kind']) { s.logs.push({ id: s.nextLogId++, text, kind }); if (s.logs.length > 150) s.logs.splice(0, s.logs.length - 150); }
function popup(s: BattleState, targetId: string, text: string, kind: PopupKind) { (s.popups ??= []).push({ key: s.nextPopupKey++, targetId, text, kind }); }
const statVal = (f: Fighter, t: StatusType) => getStatus(f, t)?.value ?? 0;
export const effAtk = (f: Fighter) => f.atk * Math.max(0.2, 1 + statVal(f, 'atkUp') - statVal(f, 'atkDown'));
export const effDef = (f: Fighter) => f.def * Math.max(0.2, 1 + statVal(f, 'defUp') - statVal(f, 'defDown'));
export const effSpd = (f: Fighter) => f.spd * Math.max(0.3, 1 + statVal(f, 'haste') - statVal(f, 'slow'));
export const potionHeal = (f: Fighter) => Math.max(POTION_HEAL, Math.floor(f.maxHp * POTION_PCT));
export const cloneFighters = (fs: Fighter[]) => fs.map(f => ({ ...f, skills: [...f.skills], cooldowns: { ...f.cooldowns }, statuses: f.statuses.map(st => ({ ...st })) }));
export function cloneState(s: BattleState): BattleState { return { ...s, fighters: cloneFighters(s.fighters), logs: [...s.logs], popups: undefined, banner: undefined, animation: undefined }; }
export function getTurnOrder(state: BattleState): Fighter[] { return state.fighters.filter(f => f.alive && f.hp > 0).slice().sort((a, b) => effSpd(b) - effSpd(a)); }
export const battleOver = (s: BattleState) => living(s.fighters, 'enemy').length === 0 || living(s.fighters, 'ally').length === 0;

// ---------- damage / status ----------
function kill(s: BattleState, f: Fighter) { f.hp = 0; f.alive = false; f.statuses = []; f.defending = false; }
// DEF is a ratio, not a subtraction: reduction = def / (def + C), where C grows with the attacker's level so
// defence keeps meaning the same thing at Lv.100 as at Lv.1.
export const DEF_CURVE = { base: 20, perLevel: 6 };
export function defFactor(target: Fighter, attacker: Fighter): number {
  const d = effDef(target); return 1 - d / (d + DEF_CURVE.base + DEF_CURVE.perLevel * attacker.level);
}
function dealDamage(s: BattleState, attacker: Fighter, target: Fighter, power: number, allowCounter = true): number {
  if (!target.alive) return 0;
  if (getStatus(target, 'invuln')) { popup(s, target.id, '무적', 'block'); return 0; }
  const crit = rand(s) < CRIT_CHANCE;
  const raw = power * (crit ? CRIT_MULT : 1) * defFactor(target, attacker);
  let mult = 1;
  if (target.defending) mult *= 1 - DEFEND_REDUCTION;
  mult *= 1 - statVal(target, 'reduce');
  mult *= 1 + statVal(target, 'mark');
  let dmg = Math.max(1, Math.floor(raw * mult));
  const barrier = getStatus(target, 'barrier');
  if (barrier && barrier.value > 0) {
    const absorbed = Math.min(barrier.value, dmg); barrier.value -= absorbed; dmg -= absorbed;
    if (barrier.value <= 0) target.statuses = target.statuses.filter(st => st !== barrier);
    if (dmg === 0) { popup(s, target.id, `막음 ${absorbed}`, 'block'); return 0; }
  }
  target.hp = clamp(target.hp - dmg, 0, target.maxHp);
  popup(s, target.id, crit ? `${dmg}!` : `${dmg}`, crit ? 'crit' : 'damage');
  const reflect = getStatus(target, 'counter');
  if (target.hp === 0) kill(s, target);
  else if (reflect && allowCounter && attacker.alive) {
    const back = Math.max(1, Math.floor(dmg * reflect.value));
    attacker.hp = clamp(attacker.hp - back, 0, attacker.maxHp); popup(s, attacker.id, `${back}`, 'damage');
    log(s, `${josa(target.name, '은/는')} 반격했다! ${attacker.name}에게 ${back} 피해${attacker.hp === 0 ? ' — 쓰러졌다!' : ''}`, 'damage');
    if (attacker.hp === 0) kill(s, attacker);
  }
  return dmg;
}
function healFighter(s: BattleState, t: Fighter, amount: number): number {
  const before = t.hp; t.hp = clamp(t.hp + amount, 0, t.maxHp);
  if (t.hp > before) popup(s, t.id, `+${t.hp - before}`, 'heal');
  return t.hp - before;
}
const CC: StatusType[] = ['freeze', 'stun'];
function applyEffect(s: BattleState, source: Fighter, recipient: Fighter, e: EffectSpec): boolean {
  if (!recipient.alive) return false;
  let chance = e.chance ?? 1;
  if (CC.includes(e.status) && recipient.boss) chance *= 0.5;      // bosses resist crowd control
  if (chance < 1 && rand(s) >= chance) return false;
  let value = e.value ?? 0;
  if (e.status === 'burn' || e.status === 'regen' || e.status === 'barrier') {
    const base = e.scale === 'maxHp' ? source.maxHp : effAtk(source);
    value = Math.max(1, Math.floor(value * base));
  }
  const existing = getStatus(recipient, e.status);
  if (existing) { existing.turns = Math.max(existing.turns, e.turns); existing.value = Math.max(existing.value, value); }
  else recipient.statuses.push({ type: e.status, turns: e.turns, value });
  const lab = STATUS_LABEL[e.status]; popup(s, recipient.id, `${lab.icon}${lab.name}`, 'status');
  return true;
}

// ---------- targeting ----------
function pickOpposing(s: BattleState, actor: Fighter, preferredId?: string): Fighter | undefined {
  const foes = living(s.fighters, other(actor.side));
  return foes.find(f => getStatus(f, 'taunt')) ?? foes.find(f => f.id === preferredId) ?? weakest(foes);
}
export function resolveTargets(s: BattleState, actor: Fighter, skill: Skill, targetId?: string): Fighter[] {
  const allies = living(s.fighters, actor.side);
  switch (skill.target) {
    case 'enemy': { const t = pickOpposing(s, actor, targetId); return t ? [t] : []; }
    case 'allEnemies': return living(s.fighters, other(actor.side));
    case 'ally': { const t = allies.find(f => f.id === targetId) ?? weakest(allies); return t ? [t] : []; }
    case 'allAllies': return skill.revive ? s.fighters.filter(f => f.side === actor.side) : allies;
    case 'self': return [actor];
    case 'deadAlly': { const dead = s.fighters.filter(f => f.side === actor.side && !f.alive); const t = dead.find(f => f.id === targetId) ?? dead[0]; return t ? [t] : []; }
  }
}
export const skillUsable = (actor: Fighter, skill: Skill): string | null => {
  if (actor.side === 'ally' && actor.mp < skill.mp) return 'MP 부족';
  if ((actor.cooldowns[skill.id] ?? 0) > 0) return `재사용 ${actor.cooldowns[skill.id]}턴`;
  return null;
};

// ---------- actions ----------
function useSkill(s: BattleState, actor: Fighter, skill: Skill, targetId?: string): boolean {
  const why = skillUsable(actor, skill);
  if (why) { log(s, `${actor.name}의 ${skill.name}: ${why}`); return false; }
  const targets = resolveTargets(s, actor, skill, targetId);
  if (!targets.length) { log(s, `${josa(skill.name, '을/를')} 사용할 대상이 없다.`); return false; }
  if (skill.target === 'ally' && skill.heal && targets[0].hp >= targets[0].maxHp) { log(s, `${josa(targets[0].name, '은/는')} 이미 체력이 가득 차 있다.`); return false; }
  if (actor.side === 'ally') actor.mp -= skill.mp;
  if (skill.cooldown > 0) actor.cooldowns[skill.id] = skill.cooldown + 1;
  if (skill.ultimate) s.banner = { title: skill.name, sub: `${actor.name}의 궁극기!` };
  s.animation = `skill|${actor.id}|${skill.id}`;
  const parts: string[] = [];
  if (skill.power) {
    const results: { t: Fighter; dmg: number }[] = [];
    const power = effAtk(actor) * skill.power;
    for (const t of targets) {
      let dmg = 0;
      for (let h = 0; h < (skill.hits ?? 1) && t.alive; h++) dmg += dealDamage(s, actor, t, power);
      results.push({ t, dmg });
    }
    if (skill.chain) {
      const extra = living(s.fighters, other(actor.side)).filter(f => !targets.includes(f)).sort(() => rand(s) - 0.5).slice(0, skill.chain);
      for (const t of extra) results.push({ t, dmg: dealDamage(s, actor, t, power * CHAIN_FALLOFF) });
    }
    const dead = results.filter(r => !r.t.alive).map(r => r.t.name);
    parts.push((results.length === 1 ? `${results[0].t.name}에게 ${results[0].dmg} 피해` : `${results.map(r => `${r.t.name} ${r.dmg}`).join(' · ')} 피해`) + (dead.length ? ` — ${dead.join(', ')} 쓰러짐!` : ''));
    if (skill.lifesteal && actor.alive) { const total = results.reduce((a, r) => a + r.dmg, 0); healFighter(s, actor, Math.floor(total * skill.lifesteal)); }
    log(s, `${actor.name}의 ${skill.name}! ${parts.join(' ')}`, 'damage');
  }
  if (skill.heal || skill.healPct) {
    const done: string[] = [];
    for (const t of targets) {
      if (!t.alive) {
        const frac = skill.target === 'deadAlly' ? skill.healPct ?? 0.5 : skill.revive;
        if (!frac) continue;
        t.alive = true; t.hp = Math.max(1, Math.floor(t.maxHp * frac)); t.statuses = []; popup(s, t.id, '부활!', 'heal'); done.push(`${t.name} 부활`); continue;
      }
      const amount = Math.floor((skill.heal ?? 0) * effAtk(actor)) + Math.floor((skill.healPct ?? 0) * t.maxHp);
      done.push(`${t.name} +${healFighter(s, t, amount)}`);
    }
    log(s, `${actor.name}의 ${skill.name}! ${done.join(' · ')}`, 'heal');
  }
  if (skill.effects) {
    for (const e of skill.effects) {
      const recipients = e.to === 'self' ? [actor] : e.to === 'allAllies' ? living(s.fighters, actor.side) : targets;
      const hit = recipients.filter(r => applyEffect(s, actor, r, e));
      if (hit.length) { const lab = STATUS_LABEL[e.status]; log(s, `${hit.map(h => h.name).join(', ')}: ${lab.icon} ${lab.name}`, 'status'); }
    }
  }
  return true;
}
export function performAction(state: BattleState, action: PlannedAction): BattleState {
  const next = cloneState(state);
  const actor = next.fighters.find(f => f.id === action.actorId); if (!actor || !actor.alive) return next;
  if (action.type === 'defend') { actor.defending = true; popup(next, actor.id, '방어', 'block'); log(next, `${josa(actor.name, '은/는')} 방어 태세를 취했다.`, 'system'); return next; }
  if (action.type === 'item') {
    if (actor.side !== 'ally') return next;
    if (next.potions <= 0) { log(next, '물약이 부족하다.'); return next; }
    const allies = living(next.fighters, 'ally');
    const target = allies.find(f => f.id === action.targetId) ?? weakest(allies);
    if (!target) return next;
    if (target.hp >= target.maxHp) { log(next, `${josa(target.name, '은/는')} 이미 체력이 가득 차 있다.`); return next; }
    next.potions--; const gained = healFighter(next, target, potionHeal(target)); next.animation = `heal|${target.id}`;
    log(next, `${josa(actor.name, '이/가')} ${target.name}에게 물약을 사용했다. HP +${gained}`, 'heal'); return next;
  }
  if (action.type === 'skill') { const skill = action.skillId ? SKILLS[action.skillId] : undefined; if (skill) useSkill(next, actor, skill, action.targetId); return next; }
  const target = pickOpposing(next, actor, action.targetId); if (!target) return next;
  const dmg = dealDamage(next, actor, target, effAtk(actor));
  next.animation = `attack|${actor.id}|${target.id}`;
  log(next, `${actor.name}의 공격! ${target.name}에게 ${dmg} 피해${target.alive ? '' : ' — 쓰러졌다!'}`, 'damage'); return next;
}

// ---------- enemy AI ----------
// Favor allies that are low on HP, can be finished off, or are high-threat roles (healer / caster).
const ROLE_THREAT: Record<string, number> = { cleric: 15, mage: 12 };
const roleOf = (f: Fighter) => (f.side === 'ally' ? JOBS[f.job]?.baseClass ?? '' : '');
export function pickEnemyTarget(enemy: Fighter, targets: Fighter[]): Fighter {
  const score = (t: Fighter) => {
    const dmg = Math.max(1, effAtk(enemy) * defFactor(t, enemy)) * (t.defending ? 0.5 : 1);
    return (1 - hpRatio(t)) * 50 + (dmg >= t.hp ? 100 : 0) + (ROLE_THREAT[roleOf(t)] ?? 0) + Math.min(1, dmg / t.maxHp) * 20;
  };
  return targets.slice().sort((a, b) => score(b) - score(a))[0];
}
function pickEnemySkill(s: BattleState, enemy: Fighter): Skill | undefined {
  const allies = living(s.fighters, enemy.side);
  const usable = enemy.skills.map(id => SKILLS[id]).filter((sk): sk is Skill => {
    if (!sk || (enemy.cooldowns[sk.id] ?? 0) > 0) return false;
    if (sk.target === 'ally') return allies.some(a => hpRatio(a) < 0.7);
    if (sk.target === 'self' && sk.healPct && !sk.effects) return hpRatio(enemy) < 0.7;
    if (sk.target === 'self' && sk.effects) return !sk.effects.every(e => getStatus(enemy, e.status));
    if (sk.target === 'allAllies') return allies.some(a => !getStatus(a, 'barrier'));
    return true;
  });
  if (!usable.length || rand(s) >= (enemy.boss ? 0.6 : 0.35)) return undefined;
  return usable[Math.floor(rand(s) * usable.length)];
}
function enemyAct(s: BattleState, enemy: Fighter) {
  const foes = living(s.fighters, other(enemy.side)); if (!foes.length) return;
  const skill = pickEnemySkill(s, enemy);
  if (skill) {
    const target = skill.target === 'enemy' ? pickEnemyTarget(enemy, foes) : undefined;
    if (useSkill(s, enemy, skill, target?.id)) return;
  }
  const target = pickOpposing(s, enemy, pickEnemyTarget(enemy, foes).id); if (!target) return;
  const dmg = dealDamage(s, enemy, target, effAtk(enemy));
  s.animation = `attack|${enemy.id}|${target.id}`;
  log(s, `${enemy.name}의 공격! ${josa(target.name, '이/가')} ${dmg} 피해를 입었다.${target.alive ? '' : ' 쓰러졌다!'}`, 'damage');
}

// ---------- round ----------
export const MAX_ROUNDS = 60;   // stalemate guard (e.g. a healer enemy against a party that cannot out-damage it)
function endOfRound(s: BattleState) {
  for (const f of s.fighters) {
    if (!f.alive) continue;
    const burn = getStatus(f, 'burn');
    if (burn) { f.hp = clamp(f.hp - burn.value, 0, f.maxHp); popup(s, f.id, `${burn.value}`, 'damage'); log(s, `${josa(f.name, '이/가')} 화상으로 ${burn.value} 피해${f.hp === 0 ? ' — 쓰러졌다!' : ''}`, 'damage'); if (f.hp === 0) { kill(s, f); continue; } }
    const regen = getStatus(f, 'regen');
    if (regen) healFighter(s, f, regen.value);
    // Freeze / stun last until they actually cost a turn; everything else ticks down.
    f.statuses = f.statuses.map(st => CC.includes(st.type) ? st : { ...st, turns: st.turns - 1 }).filter(st => st.turns > 0);
    for (const id of Object.keys(f.cooldowns)) { f.cooldowns[id]--; if (f.cooldowns[id] <= 0) delete f.cooldowns[id]; }
    if (f.side === 'ally') f.mp = clamp(f.mp + Math.ceil(f.maxMp * MP_REGEN_PCT), 0, f.maxMp);
    f.defending = false;
  }
}
export function resolveRound(state: BattleState, planned: PlannedAction[]): RoundResult {
  let s = cloneState(state);
  s.fighters.forEach(f => { f.defending = false; f.acted = false; });
  const steps: BattleStep[] = []; let logCursor = s.logs.length;
  const snap = () => {
    steps.push({ fighters: cloneFighters(s.fighters), logs: s.logs.slice(logCursor), popups: s.popups ?? [], animation: s.animation, banner: s.banner, potions: s.potions });
    logCursor = s.logs.length; s.popups = undefined; s.banner = undefined; s.animation = undefined;
  };
  const queue: { id: string; side: Side; action?: PlannedAction }[] = [
    ...planned.map(action => ({ id: action.actorId, side: 'ally' as Side, action })),
    ...s.fighters.filter(f => f.side === 'enemy').map(f => ({ id: f.id, side: f.side as Side }))
  ];
  const spdOf = (id: string) => { const f = s.fighters.find(x => x.id === id); return f ? effSpd(f) : 0; };
  // Defend acts first so it covers the whole round; otherwise SPD decides, allies winning ties.
  queue.sort((a, b) => (Number(b.action?.type === 'defend') - Number(a.action?.type === 'defend')) || (spdOf(b.id) - spdOf(a.id)) || (a.side === b.side ? 0 : a.side === 'ally' ? -1 : 1));
  for (const entry of queue) {
    if (battleOver(s)) break;
    const actor = s.fighters.find(f => f.id === entry.id); if (!actor || !actor.alive) continue;
    const blocker = actor.statuses.find(st => CC.includes(st.type));
    if (blocker) {
      actor.statuses = actor.statuses.filter(st => st !== blocker);
      popup(s, actor.id, blocker.type === 'freeze' ? '🧊빙결' : '💫기절', 'status');
      log(s, `${josa(actor.name, '은/는')} ${blocker.type === 'freeze' ? '얼어붙어' : '기절해'} 행동할 수 없다!`, 'status'); snap(); continue;
    }
    if (entry.action) s = performAction(s, entry.action); else enemyAct(s, actor);
    snap();
  }
  if (!battleOver(s)) { endOfRound(s); if (s.popups?.length || s.logs.length > logCursor) snap(); }
  if (living(s.fighters, 'enemy').length === 0) { s.phase = 'victory'; log(s, '승리! 적을 모두 물리쳤다.', 'system'); }
  else if (living(s.fighters, 'ally').length === 0) { s.phase = 'defeat'; log(s, '패배… 파티가 전투 불능이 되었다.', 'system'); }
  else if (s.round >= MAX_ROUNDS) { s.phase = 'defeat'; log(s, `${MAX_ROUNDS}라운드 안에 결판을 내지 못해 퇴각했다.`, 'system'); }
  else {
    s.round += 1; s.phase = 'planning';
    s.selectedId = living(s.fighters, 'ally')[0]?.id ?? s.selectedId;
    log(s, `ROUND ${s.round} — 아군의 행동을 선택하세요.`, 'system');
  }
  snap();
  const final: BattleState = { ...s, popups: undefined, banner: undefined, animation: undefined };
  return { state: final, steps };
}
