import { useState } from 'react';
import type { Progress } from '../../engine/types';
import { ITEM_LIST, ITEMS, SLOT_ICON, SLOT_LABEL, STAT_LABEL, itemTierForLevel, sellPrice, type ItemDef, type Slot } from '../../data/items';
import { STAT_KEYS, buyItem, sellItem } from '../../engine/progression';
import { ItemIcon } from '../Sprite';

const fmt = (it: ItemDef) => STAT_KEYS.filter(k => it.stats[k]).map(k => `${STAT_LABEL[k]} +${it.stats[k]}`).join(' · ');
const CLASS_NAME: Record<string, string> = { warrior: '전사', mage: '마법사', cleric: '성직자' };
export default function Shop({ progress, onProgress }: { progress: Progress; onProgress: (p: Progress) => void }) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [slot, setSlot] = useState<Slot>('weapon');
  const topTier = itemTierForLevel(Math.max(...progress.heroes.map(h => h.level)));
  // Show gear up to one tier above the party so the next upgrade is visible before it can be worn.
  const stock = ITEM_LIST.filter(i => i.rarity === 'normal' && i.slot === slot && i.tier <= topTier + 1);
  const owned = Object.entries(progress.inventory).map(([id, n]) => ({ item: ITEMS[id], n })).filter(x => x.item);
  return <div className="shop">
    <div className="tab-row small"><button className={mode === 'buy' ? 'on' : ''} onClick={() => setMode('buy')}>구매</button><button className={mode === 'sell' ? 'on' : ''} onClick={() => setMode('sell')}>판매</button>
      <span className="gold-tag">💰 {progress.gold.toLocaleString()} G</span></div>
    {mode === 'buy' ? <>
      <div className="tab-row small">{(['weapon', 'armor', 'accessory'] as Slot[]).map(s => <button key={s} className={slot === s ? 'on' : ''} onClick={() => setSlot(s)}>{SLOT_ICON[s]} {SLOT_LABEL[s]}</button>)}</div>
      <div className="item-list">{stock.slice().reverse().map(it => <div key={it.id} className="item-row"><ItemIcon item={it} className="item-ico" /><div className="item-main"><b>{it.name}</b>
        <small>{fmt(it)} · Lv.{it.minLevel}{it.classes ? ` · ${it.classes.map(c => CLASS_NAME[c]).join('/')}` : ''}</small></div>
        <button className="primary-btn small" disabled={progress.gold < it.price} onClick={() => onProgress(buyItem(progress, it.id))}>{it.price.toLocaleString()} G</button></div>)}</div>
      <small className="muted">✦ 상급 장비는 보스 전투에서만 획득할 수 있습니다.</small>
    </> : <div className="item-list">{owned.length === 0 && <p className="muted">판매할 장비가 없습니다.</p>}
      {owned.map(({ item, n }) => <div key={item.id} className={`item-row ${item.rarity}`}><ItemIcon item={item} className="item-ico" /><div className="item-main"><b>{item.name} ×{n}</b><small>{fmt(item)} · Lv.{item.minLevel}</small></div>
        <button className="primary-btn small" onClick={() => onProgress(sellItem(progress, item.id, sellPrice(item)))}>{sellPrice(item).toLocaleString()} G에 판매</button></div>)}</div>}
  </div>;
}
