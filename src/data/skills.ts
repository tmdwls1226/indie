import type { StatusType } from '../engine/types';

export type SkillTarget = 'enemy' | 'allEnemies' | 'ally' | 'allAllies' | 'self' | 'deadAlly';
export interface EffectSpec {
  status: StatusType; turns: number; value?: number; chance?: number;
  to?: 'target' | 'self' | 'allAllies';          // who receives the status (default: every target of the skill)
  scale?: 'atk' | 'maxHp';                       // stat that burn / regen / barrier values are multiples of (default atk)
}
export interface Skill {
  id: string; name: string; icon: string; mp: number; cooldown: number; target: SkillTarget; detail: string;
  power?: number;        // damage = power x ATK per hit
  hits?: number;         // number of hits per target (default 1)
  chain?: number;        // extra random enemies hit after the main target, at CHAIN_FALLOFF of the damage
  heal?: number;         // heal = heal x ATK
  healPct?: number;      // heal = healPct x target max HP
  revive?: number;       // allAllies only: also revives fallen allies at this fraction of max HP
  lifesteal?: number;    // fraction of damage dealt returned to the caster
  effects?: EffectSpec[];
  ultimate?: boolean;
}
export const CHAIN_FALLOFF = 0.6;

const S = (s: Skill): [string, Skill] => [s.id, s];
const list: [string, Skill][] = [
  // ---- warrior ----
  S({ id: 'strike', name: '강타', icon: '✹', mp: 6, cooldown: 0, target: 'enemy', power: 1.5, detail: '공격력 150%의 강화 공격' }),
  S({ id: 'spin_slash', name: '회전 베기', icon: '⟳', mp: 12, cooldown: 1, target: 'allEnemies', power: 0.8, detail: '적 전체에 공격력 80% 피해' }),
  S({ id: 'iron_stance', name: '철벽 자세', icon: '⬟', mp: 8, cooldown: 3, target: 'self', effects: [{ status: 'defUp', turns: 3, value: 0.6 }], detail: '3턴간 방어력 +60%' }),
  S({ id: 'gale_combo', name: '질풍 연격', icon: '≫', mp: 16, cooldown: 1, target: 'enemy', power: 0.6, hits: 3, detail: '단일 대상 3연타 (공격력 60% × 3)' }),
  S({ id: 'shatter_blade', name: '파쇄검', icon: '✂', mp: 18, cooldown: 2, target: 'enemy', power: 2.2, effects: [{ status: 'defDown', turns: 3, value: 0.3 }], detail: '공격력 220% 피해, 3턴간 방어력 -30%' }),
  S({ id: 'taunt_shield', name: '도발의 방패', icon: '◉', mp: 10, cooldown: 3, target: 'self', effects: [{ status: 'taunt', turns: 2 }, { status: 'reduce', turns: 2, value: 0.3 }], detail: '2턴간 적의 공격을 끌어오고 받는 피해 30% 감소' }),
  S({ id: 'shield_bash', name: '방패 강타', icon: '▣', mp: 14, cooldown: 3, target: 'enemy', power: 1.3, effects: [{ status: 'stun', turns: 1, chance: 0.5 }], detail: '공격력 130% 피해, 50% 확률로 기절' }),
  S({ id: 'flash_slash', name: '섬광참', icon: '⚡', mp: 26, cooldown: 2, target: 'enemy', power: 3.0, detail: '공격력 300%의 일섬' }),
  S({ id: 'blade_burst', name: '검기 폭발', icon: '✺', mp: 34, cooldown: 3, target: 'allEnemies', power: 1.5, detail: '적 전체에 공격력 150% 피해' }),
  S({ id: 'guard_barrier', name: '수호 결계', icon: '◈', mp: 30, cooldown: 4, target: 'allAllies', effects: [{ status: 'barrier', turns: 3, value: 0.35, scale: 'maxHp' }], detail: '아군 전체에 시전자 최대 HP 35%의 보호막 (3턴)' }),
  S({ id: 'counter_stance', name: '반격 태세', icon: '↺', mp: 22, cooldown: 4, target: 'self', effects: [{ status: 'counter', turns: 3, value: 0.6 }, { status: 'reduce', turns: 3, value: 0.3 }], detail: '3턴간 받은 피해의 60%를 반사, 받는 피해 30% 감소' }),
  S({ id: 'sky_cleave', name: '천공단절', icon: '☄', mp: 60, cooldown: 4, target: 'allEnemies', power: 3.2, ultimate: true, detail: '[궁극기] 적 전체에 공격력 320% 피해' }),
  S({ id: 'endless_dance', name: '무한검무', icon: '❂', mp: 70, cooldown: 4, target: 'enemy', power: 0.9, hits: 7, ultimate: true, detail: '[궁극기] 단일 대상 7연타 (공격력 90% × 7)' }),
  S({ id: 'immortal_sanctuary', name: '불멸의 성역', icon: '✦', mp: 80, cooldown: 6, target: 'allAllies', effects: [{ status: 'invuln', turns: 2 }], ultimate: true, detail: '[궁극기] 아군 전체가 2턴간 모든 피해 무효' }),
  S({ id: 'last_shield', name: '최후의 방패', icon: '⬢', mp: 70, cooldown: 5, target: 'allAllies', effects: [{ status: 'barrier', turns: 3, value: 0.6, scale: 'maxHp' }, { status: 'taunt', turns: 2, to: 'self' }], ultimate: true, detail: '[궁극기] 아군 전체 대형 보호막(시전자 최대 HP 60%) + 시전자 도발' }),
  // ---- mage ----
  S({ id: 'fireball', name: '화염구', icon: '✦', mp: 10, cooldown: 0, target: 'enemy', power: 1.6, detail: '공격력 160%의 화염 피해' }),
  S({ id: 'magic_bolt', name: '마력탄', icon: '·', mp: 4, cooldown: 0, target: 'enemy', power: 1.2, detail: '적은 MP로 쓰는 공격력 120% 마법탄' }),
  S({ id: 'focus', name: '마력 집중', icon: '◎', mp: 8, cooldown: 4, target: 'self', effects: [{ status: 'atkUp', turns: 3, value: 0.4 }], detail: '3턴간 공격력 +40%' }),
  S({ id: 'inferno', name: '폭염', icon: '♨', mp: 20, cooldown: 1, target: 'allEnemies', power: 1.1, effects: [{ status: 'burn', turns: 2, value: 0.3, chance: 0.5 }], detail: '적 전체 공격력 110%, 50% 확률로 화상' }),
  S({ id: 'scorching_mark', name: '작열의 낙인', icon: '✱', mp: 18, cooldown: 2, target: 'enemy', power: 1.4, effects: [{ status: 'mark', turns: 3, value: 0.3 }, { status: 'burn', turns: 3, value: 0.35 }], detail: '공격력 140%, 3턴간 받는 피해 +30%와 화상' }),
  S({ id: 'ice_lance', name: '빙창', icon: '❄', mp: 16, cooldown: 0, target: 'enemy', power: 1.8, effects: [{ status: 'slow', turns: 2, value: 0.35, chance: 0.6 }], detail: '공격력 180%, 60% 확률로 속도 -35%' }),
  S({ id: 'frost_barrier', name: '빙결 결계', icon: '❅', mp: 26, cooldown: 3, target: 'allEnemies', power: 0.7, effects: [{ status: 'freeze', turns: 1, chance: 0.3 }], detail: '적 전체 공격력 70%, 30% 확률로 빙결(행동 불가)' }),
  S({ id: 'chain_lightning', name: '연쇄 번개', icon: 'ϟ', mp: 18, cooldown: 1, target: 'enemy', power: 1.6, chain: 2, detail: '공격력 160%, 다른 적 2명에게 연쇄 (60%)' }),
  S({ id: 'static_charge', name: '전류 충전', icon: '⚙', mp: 14, cooldown: 4, target: 'self', effects: [{ status: 'haste', turns: 3, value: 0.4 }, { status: 'atkUp', turns: 3, value: 0.25 }], detail: '3턴간 속도 +40%, 공격력 +25%' }),
  S({ id: 'crimson_storm', name: '홍련 폭풍', icon: '❃', mp: 55, cooldown: 2, target: 'allEnemies', power: 2.0, effects: [{ status: 'burn', turns: 3, value: 0.5, chance: 0.8 }], detail: '적 전체 공격력 200%, 80% 확률로 화상' }),
  S({ id: 'flame_judgment', name: '불꽃의 심판', icon: '☀', mp: 50, cooldown: 3, target: 'enemy', power: 4.0, effects: [{ status: 'burn', turns: 3, value: 0.5 }], detail: '공격력 400% + 화상' }),
  S({ id: 'glacier_burst', name: '빙하 폭발', icon: '✢', mp: 50, cooldown: 2, target: 'allEnemies', power: 1.6, effects: [{ status: 'slow', turns: 2, value: 0.4, chance: 0.8 }], detail: '적 전체 공격력 160%, 80% 확률로 속도 -40%' }),
  S({ id: 'frost_prison', name: '서리 감옥', icon: '▦', mp: 38, cooldown: 3, target: 'enemy', power: 1.0, effects: [{ status: 'freeze', turns: 1, chance: 0.8 }], detail: '공격력 100%, 80% 확률로 빙결' }),
  S({ id: 'thunder_descent', name: '천뢰 강림', icon: '☇', mp: 55, cooldown: 3, target: 'allEnemies', power: 1.8, effects: [{ status: 'stun', turns: 1, chance: 0.3 }], detail: '적 전체 공격력 180%, 30% 확률로 기절' }),
  S({ id: 'chain_thunderbolt', name: '연쇄 낙뢰', icon: '⚡', mp: 52, cooldown: 2, target: 'enemy', power: 2.4, chain: 3, detail: '공격력 240%, 다른 적 3명에게 연쇄 (60%)' }),
  S({ id: 'solar_blast', name: '태양 폭발', icon: '☼', mp: 110, cooldown: 4, target: 'allEnemies', power: 3.6, effects: [{ status: 'burn', turns: 3, value: 0.6 }], ultimate: true, detail: '[궁극기] 적 전체 공격력 360% + 화상' }),
  S({ id: 'doom_flame', name: '종말의 불꽃', icon: '✹', mp: 100, cooldown: 4, target: 'enemy', power: 7.5, effects: [{ status: 'burn', turns: 3, value: 0.6 }], ultimate: true, detail: '[궁극기] 공격력 750% + 화상' }),
  S({ id: 'eternal_winter', name: '영원의 겨울', icon: '❆', mp: 105, cooldown: 5, target: 'allEnemies', power: 2.2, effects: [{ status: 'freeze', turns: 1, chance: 0.6 }, { status: 'slow', turns: 3, value: 0.4 }], ultimate: true, detail: '[궁극기] 적 전체 공격력 220%, 60% 빙결 + 속도 감소' }),
  S({ id: 'ice_prison_collapse', name: '빙옥 붕괴', icon: '▩', mp: 100, cooldown: 4, target: 'enemy', power: 6.5, effects: [{ status: 'freeze', turns: 1, chance: 0.5 }], ultimate: true, detail: '[궁극기] 공격력 650%, 50% 확률로 빙결' }),
  S({ id: 'sky_thunder', name: '천공낙뢰', icon: '⚡', mp: 100, cooldown: 4, target: 'enemy', power: 5.5, chain: 3, ultimate: true, detail: '[궁극기] 공격력 550%, 다른 적 3명에게 연쇄' }),
  S({ id: 'divine_wrath', name: '신벌', icon: '☇', mp: 120, cooldown: 5, target: 'allEnemies', power: 3.8, effects: [{ status: 'stun', turns: 1, chance: 0.35 }], ultimate: true, detail: '[궁극기] 적 전체 공격력 380%, 35% 확률로 기절' }),
  // ---- cleric ----
  S({ id: 'heal', name: '치유', icon: '✚', mp: 5, cooldown: 0, target: 'ally', heal: 3.2, detail: '아군 1명 회복 (공격력 320%)' }),
  S({ id: 'holy_bolt', name: '성광탄', icon: '✧', mp: 6, cooldown: 0, target: 'enemy', power: 1.4, detail: '공격력 140%의 신성 피해' }),
  S({ id: 'bless', name: '축복', icon: '✥', mp: 14, cooldown: 4, target: 'allAllies', effects: [{ status: 'atkUp', turns: 3, value: 0.25 }], detail: '아군 전체 3턴간 공격력 +25%' }),
  S({ id: 'holy_strike', name: '신성 강타', icon: '✠', mp: 14, cooldown: 1, target: 'enemy', power: 2.0, detail: '공격력 200%의 신성 피해' }),
  S({ id: 'light_judgment', name: '빛의 심판', icon: '☀', mp: 22, cooldown: 2, target: 'allEnemies', power: 1.2, detail: '적 전체 공격력 120%' }),
  S({ id: 'mass_heal', name: '광역 치유', icon: '✚', mp: 22, cooldown: 2, target: 'allAllies', heal: 2.0, detail: '아군 전체 회복 (공격력 200%)' }),
  S({ id: 'guardian_hymn', name: '수호의 찬가', icon: '♪', mp: 24, cooldown: 4, target: 'allAllies', effects: [{ status: 'defUp', turns: 3, value: 0.3 }, { status: 'regen', turns: 3, value: 0.5 }], detail: '아군 전체 3턴간 방어력 +30%, 매 턴 재생' }),
  S({ id: 'heavenly_spear', name: '천벌의 창', icon: '↟', mp: 36, cooldown: 2, target: 'enemy', power: 3.4, detail: '공격력 340%의 신성 피해' }),
  S({ id: 'holy_blast', name: '성화 폭발', icon: '✹', mp: 44, cooldown: 3, target: 'allEnemies', power: 1.8, effects: [{ status: 'burn', turns: 2, value: 0.3 }], detail: '적 전체 공격력 180% + 성화(화상)' }),
  S({ id: 'fountain_of_life', name: '생명의 샘', icon: '◍', mp: 42, cooldown: 4, target: 'allAllies', heal: 1.5, effects: [{ status: 'regen', turns: 4, value: 1.2 }], detail: '아군 전체 회복 + 4턴간 강한 재생' }),
  S({ id: 'prayer_revive', name: '부활 기도', icon: '☥', mp: 50, cooldown: 5, target: 'deadAlly', healPct: 0.5, detail: '쓰러진 아군 1명을 최대 HP 50%로 부활' }),
  S({ id: 'divine_descent', name: '신의 강림', icon: '☄', mp: 100, cooldown: 5, target: 'allEnemies', power: 3.2, effects: [{ status: 'atkUp', turns: 3, value: 0.3, to: 'allAllies' }], ultimate: true, detail: '[궁극기] 적 전체 공격력 320% + 아군 공격력 +30%' }),
  S({ id: 'final_judgment', name: '최후의 심판', icon: '⚖', mp: 90, cooldown: 4, target: 'enemy', power: 7.0, ultimate: true, detail: '[궁극기] 공격력 700%의 심판' }),
  S({ id: 'dawn_of_miracle', name: '기적의 새벽', icon: '☼', mp: 100, cooldown: 5, target: 'allAllies', healPct: 0.6, effects: [{ status: 'defUp', turns: 3, value: 0.3 }], ultimate: true, detail: '[궁극기] 아군 전체 최대 HP 60% 회복 + 방어력 +30%' }),
  S({ id: 'miracle_of_life', name: '생명의 기적', icon: '❦', mp: 120, cooldown: 6, target: 'allAllies', healPct: 0.5, revive: 0.5, ultimate: true, detail: '[궁극기] 아군 전체 최대 HP 50% 회복, 쓰러진 아군도 부활' }),
  // ---- monster skills (MP is not consumed by monsters) ----
  S({ id: 'm_slam', name: '강타', icon: '✹', mp: 0, cooldown: 3, target: 'enemy', power: 1.7, detail: '' }),
  S({ id: 'm_roar', name: '포효', icon: '◎', mp: 0, cooldown: 4, target: 'self', effects: [{ status: 'atkUp', turns: 3, value: 0.35 }], detail: '' }),
  S({ id: 'm_cleave', name: '휩쓸기', icon: '⟳', mp: 0, cooldown: 4, target: 'allEnemies', power: 0.8, detail: '' }),
  S({ id: 'm_poison', name: '독 침', icon: '☣', mp: 0, cooldown: 3, target: 'enemy', power: 1.0, effects: [{ status: 'burn', turns: 3, value: 0.3 }], detail: '' }),
  S({ id: 'm_drain', name: '생명 흡수', icon: '♥', mp: 0, cooldown: 3, target: 'enemy', power: 1.2, lifesteal: 0.7, detail: '' }),
  S({ id: 'm_fire_breath', name: '화염 숨결', icon: '♨', mp: 0, cooldown: 4, target: 'allEnemies', power: 0.9, effects: [{ status: 'burn', turns: 2, value: 0.25, chance: 0.6 }], detail: '' }),
  S({ id: 'm_freeze_breath', name: '냉기 숨결', icon: '❄', mp: 0, cooldown: 4, target: 'allEnemies', power: 0.7, effects: [{ status: 'slow', turns: 2, value: 0.3 }], detail: '' }),
  S({ id: 'm_shock', name: '전격', icon: 'ϟ', mp: 0, cooldown: 3, target: 'enemy', power: 1.3, chain: 1, detail: '' }),
  S({ id: 'm_stun_strike', name: '기절 일격', icon: '▣', mp: 0, cooldown: 5, target: 'enemy', power: 1.2, effects: [{ status: 'stun', turns: 1, chance: 0.45 }], detail: '' }),
  S({ id: 'm_heal', name: '치유의 주문', icon: '✚', mp: 0, cooldown: 3, target: 'ally', healPct: 0.3, detail: '' }),
  S({ id: 'm_shield', name: '수호의 막', icon: '◈', mp: 0, cooldown: 4, target: 'allAllies', effects: [{ status: 'barrier', turns: 3, value: 0.2, scale: 'maxHp' }], detail: '' }),
  S({ id: 'm_curse', name: '약화의 저주', icon: '☠', mp: 0, cooldown: 4, target: 'allEnemies', power: 0.5, effects: [{ status: 'atkDown', turns: 3, value: 0.25 }], detail: '' }),
  S({ id: 'm_apocalypse', name: '종말의 일격', icon: '☄', mp: 0, cooldown: 5, target: 'allEnemies', power: 1.6, detail: '' }),
  S({ id: 'm_volley', name: '일제 사격', icon: '➶', mp: 0, cooldown: 4, target: 'allEnemies', power: 0.7, detail: '' }),
  S({ id: 'm_spore', name: '포자', icon: '☁', mp: 0, cooldown: 4, target: 'allEnemies', power: 0.5, effects: [{ status: 'atkDown', turns: 2, value: 0.2 }], detail: '' }),
  // chapter-boss signature skills
  S({ id: 'm_death_bell', name: '망자의 종', icon: '🔔', mp: 0, cooldown: 4, target: 'allEnemies', power: 0.8, effects: [{ status: 'atkDown', turns: 2, value: 0.25 }], detail: '' }),
  S({ id: 'm_chain_smash', name: '쇠사슬 강타', icon: '⛓', mp: 0, cooldown: 3, target: 'enemy', power: 1.9, effects: [{ status: 'stun', turns: 1, chance: 0.3 }], detail: '' }),
  S({ id: 'm_echo', name: '부활의 메아리', icon: '♥', mp: 0, cooldown: 5, target: 'self', healPct: 0.1, detail: '' }),
  S({ id: 'm_shield_stance', name: '방패 태세', icon: '⬟', mp: 0, cooldown: 4, target: 'self', effects: [{ status: 'reduce', turns: 2, value: 0.4 }, { status: 'counter', turns: 2, value: 0.4 }], detail: '' }),
  S({ id: 'm_oblivion_mark', name: '망각의 낙인', icon: '✱', mp: 0, cooldown: 3, target: 'enemy', power: 1.0, effects: [{ status: 'mark', turns: 3, value: 0.3 }, { status: 'atkDown', turns: 3, value: 0.2 }], detail: '' }),
  S({ id: 'm_last_charge', name: '최후의 돌격', icon: '☄', mp: 0, cooldown: 5, target: 'enemy', power: 2.6, detail: '' }),
  S({ id: 'm_overcharge', name: '마력 충전', icon: '◎', mp: 0, cooldown: 4, target: 'self', effects: [{ status: 'atkUp', turns: 3, value: 0.4 }], detail: '' }),
  S({ id: 'm_core_exposed', name: '핵심 노출', icon: '◉', mp: 0, cooldown: 6, target: 'self', effects: [{ status: 'mark', turns: 2, value: 0.35 }], detail: '' }),
  S({ id: 'm_overload', name: '과부하', icon: '✺', mp: 0, cooldown: 5, target: 'allEnemies', power: 1.6, detail: '' }),
  S({ id: 'm_time_stop', name: '시간 정지', icon: '⏳', mp: 0, cooldown: 5, target: 'allEnemies', power: 0.5, effects: [{ status: 'freeze', turns: 1, chance: 0.3 }], detail: '' }),
  S({ id: 'm_rewind', name: '시간 역행', icon: '↺', mp: 0, cooldown: 5, target: 'self', healPct: 0.12, detail: '' }),
  S({ id: 'm_royal_command', name: '왕의 명령', icon: '♛', mp: 0, cooldown: 4, target: 'allEnemies', power: 0.9, effects: [{ status: 'defDown', turns: 3, value: 0.25 }, { status: 'atkDown', turns: 3, value: 0.2 }], detail: '' }),
  S({ id: 'm_black_wave', name: '검은 파동', icon: '≋', mp: 0, cooldown: 4, target: 'allEnemies', power: 1.3, detail: '' }),
  S({ id: 'm_memory_chain', name: '기억의 사슬', icon: '⛓', mp: 0, cooldown: 3, target: 'enemy', power: 1.2, effects: [{ status: 'slow', turns: 2, value: 0.4 }, { status: 'atkDown', turns: 2, value: 0.25 }], detail: '' }),
  S({ id: 'm_still_judgment', name: '정지의 심판', icon: '⚖', mp: 0, cooldown: 6, target: 'allEnemies', power: 1.9, effects: [{ status: 'stun', turns: 1, chance: 0.3 }], detail: '' })
];
export const SKILLS: Record<string, Skill> = Object.fromEntries(list);
export const POTION_COUNT = 3;
export const POTION_HEAL = 40;
export const POTION_PCT = 0.3;
export const DEFEND_REDUCTION = 0.5;
export const CRIT_CHANCE = 0.1;
export const CRIT_MULT = 1.5;
export const MP_REGEN_PCT = 0.06;
export const STATUS_LABEL: Record<StatusType, { name: string; icon: string; good: boolean }> = {
  burn: { name: '화상', icon: '🔥', good: false }, freeze: { name: '빙결', icon: '🧊', good: false }, stun: { name: '기절', icon: '💫', good: false },
  slow: { name: '둔화', icon: '🐌', good: false }, haste: { name: '가속', icon: '💨', good: true }, atkUp: { name: '공격 강화', icon: '⚔', good: true },
  atkDown: { name: '공격 약화', icon: '⬇', good: false }, defUp: { name: '방어 강화', icon: '🛡', good: true }, defDown: { name: '방어 약화', icon: '💔', good: false },
  taunt: { name: '도발', icon: '📢', good: true }, regen: { name: '재생', icon: '🌿', good: true }, barrier: { name: '보호막', icon: '🔷', good: true },
  invuln: { name: '무적', icon: '✨', good: true }, counter: { name: '반격', icon: '↺', good: true }, reduce: { name: '피해 감소', icon: '⬟', good: true },
  mark: { name: '낙인', icon: '🎯', good: false }
};
