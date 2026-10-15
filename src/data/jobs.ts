import type { BaseClass } from '../engine/types';

export interface StatMult { hp: number; mp: number; atk: number; def: number; spd: number; }
export interface JobDef {
  id: string; name: string; baseClass: BaseClass; tier: 0 | 1 | 2 | 3 | 4; minLevel: number; parent?: string;
  branch: string; skills: string[]; mult: StatMult; desc: string;
}
// Level at which each promotion tier becomes available; a hero cannot level past the next gate until promoted.
export const PROMOTION_LEVELS = [10, 30, 70, 100] as const;
export const LEVEL_CAP = 100;
// Level of the next promotion gate for a hero at `tier`, or undefined once fully promoted.
export const gateLevel = (tier: number): number | undefined => (PROMOTION_LEVELS as readonly number[])[tier];
// Skill slots per tier (Lv1-9 / 1st / 2nd / 3rd / final).
export const SKILL_SLOTS = [1, 3, 4, 5, 6] as const;

const m = (hp: number, mp: number, atk: number, def: number, spd: number): StatMult => ({ hp, mp, atk, def, spd });
const J = (id: string, name: string, baseClass: BaseClass, tier: JobDef['tier'], parent: string | undefined, branch: string, skills: string[], mult: StatMult, desc: string): JobDef =>
  ({ id, name, baseClass, tier, minLevel: tier === 0 ? 1 : PROMOTION_LEVELS[tier - 1], parent, branch, skills, mult, desc });

const defs: JobDef[] = [
  // warrior
  J('warrior', '전사', 'warrior', 0, undefined, '공통', ['strike'], m(1, 1, 1, 1, 1), '강인한 근접 전투원'),
  J('swordsman', '검사', 'warrior', 1, 'warrior', '공통', ['spin_slash', 'iron_stance'], m(1.1, 1.1, 1.1, 1.1, 1.05), '검의 기본기를 갖춘 전투원. 범위 공격과 방어 자세를 익힌다.'),
  J('blademaster', '검성', 'warrior', 2, 'swordsman', '공격형', ['gale_combo', 'shatter_blade'], m(1.3, 1.15, 1.55, 1.2, 1.12), '연타와 방어 파괴로 단일 대상을 압박하는 공격형 검사.'),
  J('guardian_knight', '수호기사', 'warrior', 2, 'swordsman', '방어형', ['taunt_shield', 'shield_bash'], m(1.45, 1.15, 1.1, 1.5, 1), '도발과 기절로 파티를 지키는 방어형 기사.'),
  J('sword_emperor', '검황', 'warrior', 3, 'blademaster', '공격형', ['flash_slash', 'blade_burst'], m(1.65, 1.3, 1.95, 1.5, 1.2), '섬광 같은 일격과 검기 폭발을 다루는 검의 황제.'),
  J('bulwark_knight', '성벽기사', 'warrior', 3, 'guardian_knight', '방어형', ['guard_barrier', 'counter_stance'], m(2.0, 1.3, 1.3, 2.0, 1.05), '보호막과 반격으로 전선을 지키는 철벽의 기사.'),
  J('heaven_sword', '천검제', 'warrior', 4, 'sword_emperor', '공격형', ['sky_cleave', 'endless_dance'], m(2.2, 1.5, 2.5, 1.9, 1.3), '하늘을 가르는 검의 제왕.'),
  J('immortal_king', '불멸의 수호왕', 'warrior', 4, 'bulwark_knight', '방어형', ['immortal_sanctuary', 'last_shield'], m(2.8, 1.5, 1.6, 2.8, 1.1), '쓰러지지 않는 파티의 수호왕.'),
  // mage
  J('mage', '마법사', 'mage', 0, undefined, '공통', ['fireball'], m(1, 1, 1, 1, 1), '강력한 원거리 마법'),
  J('elementalist', '원소술사', 'mage', 1, 'mage', '공통', ['magic_bolt', 'focus'], m(1.1, 1.25, 1.1, 1.1, 1.05), '원소의 기초를 익혀 마력을 효율적으로 다룬다.'),
  J('pyromancer', '화염술사', 'mage', 2, 'elementalist', '화염', ['inferno', 'scorching_mark'], m(1.1, 1.2, 1.45, 1.1, 1.05), '폭발력과 화상으로 압도하는 화염의 마법사.'),
  J('cryomancer', '빙결술사', 'mage', 2, 'elementalist', '빙결', ['ice_lance', 'frost_barrier'], m(1.2, 1.25, 1.25, 1.25, 1), '둔화와 빙결로 전장을 통제하는 마법사.'),
  J('stormcaller', '뇌전술사', 'mage', 2, 'elementalist', '뇌전', ['chain_lightning', 'static_charge'], m(1.15, 1.2, 1.45, 1.15, 1.25), '빠른 연쇄 번개를 다루는 마법사.'),
  J('crimson_archmage', '홍련대마도사', 'mage', 3, 'pyromancer', '화염', ['crimson_storm', 'flame_judgment'], m(1.3, 1.5, 1.9, 1.3, 1.1), '불길의 폭풍을 부르는 대마도사.'),
  J('absolute_zero', '절대영도', 'mage', 3, 'cryomancer', '빙결', ['glacier_burst', 'frost_prison'], m(1.5, 1.5, 1.6, 1.6, 1.05), '모든 것을 얼리는 냉기의 대가.'),
  J('sky_thunder_mage', '천뢰마도사', 'mage', 3, 'stormcaller', '뇌전', ['thunder_descent', 'chain_thunderbolt'], m(1.4, 1.5, 1.95, 1.4, 1.35), '하늘의 번개를 내리는 대마도사.'),
  J('sun_sage', '태양의 대현자', 'mage', 4, 'crimson_archmage', '화염', ['solar_blast', 'doom_flame'], m(1.7, 2.0, 2.5, 1.7, 1.15), '태양의 불꽃을 지배하는 대현자.'),
  J('glacier_lord', '빙하의 군주', 'mage', 4, 'absolute_zero', '빙결', ['eternal_winter', 'ice_prison_collapse'], m(2.0, 2.0, 2.1, 2.1, 1.1), '영원한 겨울의 군주.'),
  J('sky_thunder_god', '천공의 뇌신', 'mage', 4, 'sky_thunder_mage', '뇌전', ['sky_thunder', 'divine_wrath'], m(1.85, 2.0, 2.6, 1.8, 1.45), '하늘을 가르는 뇌신.'),
  // cleric
  J('cleric', '성직자', 'cleric', 0, undefined, '공통', ['heal'], m(1, 1, 1, 1, 1), '회복과 보호의 전문가'),
  J('priest', '사제', 'cleric', 1, 'cleric', '공통', ['holy_bolt', 'bless'], m(1.1, 1.2, 1.15, 1.1, 1.05), '신성한 빛과 축복을 다루는 사제.'),
  J('inquisitor', '심판관', 'cleric', 2, 'priest', '공격·심판형', ['holy_strike', 'light_judgment'], m(1.2, 1.2, 1.7, 1.15, 1.1), '신성 피해로 적을 심판하는 공격형 성직자.'),
  J('high_priest', '대사제', 'cleric', 2, 'priest', '회복·지원형', ['mass_heal', 'guardian_hymn'], m(1.4, 1.35, 1.55, 1.35, 1.1), '파티 전체를 회복하고 보호하는 지원형 성직자.'),
  J('holy_inquisitor', '성천심판관', 'cleric', 3, 'inquisitor', '공격·심판형', ['heavenly_spear', 'holy_blast'], m(1.45, 1.4, 2.2, 1.35, 1.15), '천벌의 창을 던지는 심판관.'),
  J('sanctuary_priest', '성역의 대사제', 'cleric', 3, 'high_priest', '회복·지원형', ['fountain_of_life', 'prayer_revive'], m(1.8, 1.6, 2.0, 1.8, 1.15), '생명의 샘과 부활의 기도를 다루는 대사제.'),
  J('heaven_judge', '천상의 심판자', 'cleric', 4, 'holy_inquisitor', '공격·심판형', ['divine_descent', 'final_judgment'], m(1.8, 1.8, 2.8, 1.6, 1.2), '신의 강림으로 심판을 내리는 자.'),
  J('life_goddess', '생명의 여신관', 'cleric', 4, 'sanctuary_priest', '회복·지원형', ['dawn_of_miracle', 'miracle_of_life'], m(2.5, 2.2, 2.5, 2.3, 1.2), '생명의 기적을 일으키는 여신관.')
];
export const JOBS: Record<string, JobDef> = Object.fromEntries(defs.map(d => [d.id, d]));
export const childJobs = (jobId: string) => defs.filter(d => d.parent === jobId);
// Every job from the base class down to `jobId`, in promotion order.
export function jobPath(jobId: string): JobDef[] {
  const path: JobDef[] = []; let cur: JobDef | undefined = JOBS[jobId];
  while (cur) { path.unshift(cur); cur = cur.parent ? JOBS[cur.parent] : undefined; }
  return path;
}

// Base stats at level 1 and growth per level, by base class.
export const CLASS_BASE: Record<BaseClass, { hp: number; mp: number; atk: number; def: number; spd: number; emoji: string; name: string }> = {
  warrior: { hp: 120, mp: 20, atk: 20, def: 14, spd: 8, emoji: '🛡️', name: '전사' },
  mage: { hp: 75, mp: 50, atk: 25, def: 5, spd: 11, emoji: '🧙', name: '마법사' },
  cleric: { hp: 95, mp: 40, atk: 10, def: 9, spd: 10, emoji: '✨', name: '성직자' }
};
export const CLASS_GROWTH: Record<BaseClass, { hp: number; mp: number; atk: number; def: number; spd: number }> = {
  warrior: { hp: 14, mp: 2.2, atk: 2.2, def: 1.8, spd: 0.25 },
  mage: { hp: 8, mp: 5, atk: 3, def: 0.6, spd: 0.3 },
  cleric: { hp: 10, mp: 4, atk: 1.2, def: 1, spd: 0.3 }
};
