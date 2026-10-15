import type { BaseClass } from '../engine/types';

export type Slot = 'weapon' | 'armor' | 'accessory';
export interface StatBonus { hp?: number; mp?: number; atk?: number; def?: number; spd?: number; }
export interface ItemDef {
  id: string; name: string; slot: Slot; tier: number; minLevel: number; rarity: 'normal' | 'rare';
  classes?: BaseClass[]; stats: StatBonus; price: number;
}
export const SLOT_LABEL: Record<Slot, string> = { weapon: '무기', armor: '방어구', accessory: '장신구' };
export const SLOT_ICON: Record<Slot, string> = { weapon: '⚔', armor: '🛡', accessory: '💍' };
export const TIER_COUNT = 10;
const TIER_NAMES = ['수련용', '철제', '강철', '미스릴', '룬각인', '용린', '성은', '마력석', '신화', '영겁'];
const WEAPON_NAME: Record<BaseClass, string> = { warrior: '검', mage: '지팡이', cleric: '철퇴' };
const ARMOR_NAME: Record<BaseClass, string> = { warrior: '갑옷', mage: '로브', cleric: '성의' };
const CLASSES: BaseClass[] = ['warrior', 'mage', 'cleric'];
const r = Math.round;

function make(tier: number, slot: Slot, variant: BaseClass | 'ring' | 'amulet', rarity: 'normal' | 'rare'): ItemDef {
  const L = tier * 10 + 1;                // item level = minimum hero level to equip
  const q = rarity === 'rare' ? 1.3 : 1;
  const tierName = TIER_NAMES[tier];
  let name = ''; let stats: StatBonus = {}; let classes: BaseClass[] | undefined;
  if (slot === 'weapon') {
    const c = variant as BaseClass; classes = [c]; name = `${tierName} ${WEAPON_NAME[c]}`;
    stats = c === 'warrior' ? { atk: r((3 + L * 1.25) * q) } : c === 'mage' ? { atk: r((3 + L * 1.5) * q), mp: r((4 + L * 0.8) * q) } : { atk: r((2 + L * 0.7) * q), mp: r((4 + L * 0.9) * q), hp: r((5 + L * 1.5) * q) };
  } else if (slot === 'armor') {
    const c = variant as BaseClass; classes = [c]; name = `${tierName} ${ARMOR_NAME[c]}`;
    stats = c === 'warrior' ? { def: r((2 + L * 0.8) * q), hp: r((14 + L * 5) * q) } : c === 'mage' ? { def: r((1 + L * 0.4) * q), hp: r((8 + L * 2.5) * q), mp: r((4 + L * 1.2) * q) } : { def: r((1.5 + L * 0.6) * q), hp: r((10 + L * 3.5) * q), mp: r((3 + L * 0.9) * q) };
  } else {
    name = variant === 'ring' ? `${tierName} 반지` : `${tierName} 목걸이`;
    stats = variant === 'ring' ? { atk: r((1 + L * 0.45) * q), spd: r((1 + L * 0.06) * q) } : { hp: r((8 + L * 2.5) * q), mp: r((3 + L * 0.9) * q), def: r((1 + L * 0.2) * q) };
  }
  if (rarity === 'rare') name = `✦ ${name}`;
  const price = r((25 + 7 * Math.pow(L, 1.2)) * (rarity === 'rare' ? 2.5 : 1) * (slot === 'accessory' ? 0.8 : 1));
  return { id: `${slot}_${variant}_${tier}${rarity === 'rare' ? '_r' : ''}`, name, slot, tier, minLevel: L, rarity, classes, stats, price };
}
const all: ItemDef[] = [];
for (let t = 0; t < TIER_COUNT; t++) for (const rar of ['normal', 'rare'] as const) {
  for (const c of CLASSES) { all.push(make(t, 'weapon', c, rar)); all.push(make(t, 'armor', c, rar)); }
  all.push(make(t, 'accessory', 'ring', rar)); all.push(make(t, 'accessory', 'amulet', rar));
}
export const ITEMS: Record<string, ItemDef> = Object.fromEntries(all.map(i => [i.id, i]));
export const ITEM_LIST = all;
export const itemTierForLevel = (level: number) => Math.min(TIER_COUNT - 1, Math.floor((level - 1) / 10));
export const sellPrice = (item: ItemDef) => Math.max(1, Math.floor(item.price * 0.4));
export const STAT_LABEL: Record<string, string> = { hp: 'HP', mp: 'MP', atk: 'ATK', def: 'DEF', spd: 'SPD' };
