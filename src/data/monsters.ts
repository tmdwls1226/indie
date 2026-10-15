export interface MonsterDef {
  id: string; name: string; emoji: string; desc: string;
  hp: number; atk: number; def: number; spd: number;   // multipliers on the level curve (spd is a base value)
  skills: string[]; boss?: boolean;
}
// Global balance knobs, tuned with the headless simulator (src/dev/sim.ts).
export const MONSTER_TUNE = { hp: 1, atk: 1, def: 1 };
// Base curves are linear in level; LEVEL_MULT corrects them so difficulty stays flat across promotion steps and gear tiers.
// Each row is [level, hpMult, atkMult]; values between rows are interpolated. Fitted with the simulator (src/dev/sim.ts).
export const MONSTER_CURVE = { hp: [45, 28], atk: [10, 4], def: [6, 1.6] };
// Rows sit on both sides of each promotion gate (10/30/70/100) because heroes jump in power when they promote.
export const LEVEL_MULT: [number, number, number][] = [
  [1, 0.9, 0.9], [5, 0.85, 0.85], [10, 0.7, 0.6], [11, 0.85, 0.8], [20, 0.8, 0.7], [30, 0.85, 0.7], [31, 1.05, 1.15],
  [45, 1.0, 1.05], [60, 0.95, 0.92], [70, 0.9, 0.8], [71, 1.1, 1.25], [85, 1.0, 1.05], [100, 1.05, 1.1]
];
export function levelMult(level: number): { hp: number; atk: number } {
  const t = LEVEL_MULT;
  if (level <= t[0][0]) return { hp: t[0][1], atk: t[0][2] };
  for (let i = 1; i < t.length; i++) if (level <= t[i][0]) {
    const f = (level - t[i - 1][0]) / (t[i][0] - t[i - 1][0]);
    return { hp: t[i - 1][1] + (t[i][1] - t[i - 1][1]) * f, atk: t[i - 1][2] + (t[i][2] - t[i - 1][2]) * f };
  }
  return { hp: t[t.length - 1][1], atk: t[t.length - 1][2] };
}
export const BOSS_TUNE = { hp: 0.75, atk: 1.0 };   // applied on top of each boss template's own multipliers
const curve = (c: number[], L: number) => c[0] + c[1] * L;
export function monsterStats(def: MonsterDef, level: number) {
  const m = levelMult(level), b = def.boss ? BOSS_TUNE : { hp: 1, atk: 1 };
  return {
    hp: Math.round(curve(MONSTER_CURVE.hp, level) * m.hp * def.hp * MONSTER_TUNE.hp * b.hp),
    atk: Math.round(curve(MONSTER_CURVE.atk, level) * m.atk * def.atk * MONSTER_TUNE.atk * b.atk),
    def: Math.round(curve(MONSTER_CURVE.def, level) * def.def * MONSTER_TUNE.def),
    spd: Math.round(def.spd + level * 0.12)
  };
}
const M = (id: string, name: string, emoji: string, hp: number, atk: number, def: number, spd: number, skills: string[], desc: string, boss = false): MonsterDef =>
  ({ id, name, emoji, hp, atk, def, spd, skills, desc, boss });
const list: MonsterDef[] = [
  M('slime', '슬라임', '🟢', 1.4, 0.92, 1.05, 6, [], '느리지만 튼튼하다'),
  M('goblin', '고블린', '👺', 1.0, 1.08, 0.66, 12, [], '빠르고 교활하다'),
  M('skeleton', '해골 병사', '💀', 1.25, 1.3, 0.92, 9, [], '묵직한 검격을 날린다'),
  M('skeleton_archer', '해골 궁수', '🏹', 0.85, 1.35, 0.7, 12, ['m_volley'], '화살을 쏟아붓는다'),
  M('wolf', '늑대', '🐺', 1.0, 1.15, 0.7, 14, ['m_slam'], '날쌘 사냥꾼'),
  M('bat', '박쥐', '🦇', 0.7, 0.95, 0.5, 16, ['m_drain'], '어둠 속을 날아다니며 피를 빤다'),
  M('spider', '거미', '🕷️', 0.9, 1.2, 0.7, 14, ['m_poison'], '독 침을 쏜다'),
  M('mushroom', '버섯 몬스터', '🍄', 1.3, 0.9, 1.0, 6, ['m_spore'], '포자로 힘을 빼앗는다'),
  M('orc', '오크', '👹', 1.5, 1.3, 1.0, 8, ['m_roar'], '포효로 힘을 끌어올린다'),
  M('golem', '골렘', '🗿', 2.0, 1.0, 1.8, 4, ['m_slam'], '둔하지만 매우 단단하다'),
  M('dark_mage', '암흑 마법사', '🔮', 0.9, 1.3, 0.8, 10, ['m_curse', 'm_fire_breath'], '저주와 화염을 다룬다'),
  M('wraith', '유령', '👻', 1.1, 1.25, 0.8, 12, ['m_drain', 'm_curse'], '생명을 갉아먹는 원혼'),
  M('demon', '악마', '👿', 1.4, 1.4, 1.0, 11, ['m_fire_breath', 'm_curse'], '마계의 전사'),
  // chapter bosses (asset folders match the image guide: bell_keeper, forgotten_knight, time_regent, still_lord)
  M('bell_keeper', '오염된 종지기', '🔔', 3.2, 1.25, 1.4, 7, ['m_chain_smash', 'm_death_bell', 'm_echo'], '1장 보스 · 망자의 종을 울리는 자', true),
  M('forgotten_knight', '망각의 기사', '🛡️', 3.4, 1.4, 1.3, 10, ['m_shield_stance', 'm_oblivion_mark', 'm_last_charge'], '2장 보스 · 이름을 잃은 기사', true),
  M('mage_doll', '폭주한 마도 인형', '🤖', 3.6, 1.5, 1.2, 13, ['m_overcharge', 'm_core_exposed', 'm_overload'], '3장 보스 · 제어를 잃은 마도 병기', true),
  M('time_regent', '시간의 섭정', '⏳', 3.8, 1.5, 1.3, 12, ['m_time_stop', 'm_rewind', 'm_royal_command'], '4장 보스 · 멈춘 시간을 다스리는 섭정', true),
  M('still_lord', '정지의 군주', '👑', 4.4, 1.65, 1.5, 13, ['m_black_wave', 'm_memory_chain', 'm_still_judgment'], '최종 보스 · 시간을 멈춘 자', true),
  // promotion trial bosses (not part of the image guide; they get their own asset slots)
  M('trial_sentinel', '시험의 문지기', '⚔️', 3.0, 1.2, 1.3, 9, ['m_slam', 'm_stun_strike'], '1차 전직 시험관', true),
  M('trial_warden', '시험의 감시자', '🔥', 3.4, 1.35, 1.3, 11, ['m_fire_breath', 'm_slam', 'm_roar'], '2차 전직 시험관', true),
  M('trial_judge', '시험의 심판자', '⚖️', 3.8, 1.5, 1.4, 12, ['m_curse', 'm_drain', 'm_apocalypse'], '3차 전직 시험관', true),
  M('trial_god', '신의 시험', '🌟', 4.4, 1.65, 1.5, 14, ['m_shock', 'm_apocalypse', 'm_cleave'], '최종 전직 시험관', true)
];
export const MONSTERS: Record<string, MonsterDef> = Object.fromEntries(list.map(m => [m.id, m]));
