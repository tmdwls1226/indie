import { useState } from 'react';
import type { Hero, Progress } from '../../engine/types';
import { HeroFace, ItemIcon } from '../Sprite';
import { ITEMS, SLOT_ICON, SLOT_LABEL, STAT_LABEL, type Slot } from '../../data/items';
import { JOBS } from '../../data/jobs';
import { STAT_KEYS, atPromotionGate, equip, equipError, equipmentBonus, expToNext, heroStats, levelCap, unequip, type Stats } from '../../engine/progression';

const SLOTS: Slot[] = ['weapon', 'armor', 'accessory'];
const fmtStats = (s: Partial<Stats>) => STAT_KEYS.filter(k => s[k]).map(k => `${STAT_LABEL[k]} +${s[k]}`).join(' · ');

export function HeroCard({ hero, selected, onClick }: { hero: Hero; selected: boolean; onClick: () => void }) {
  const need = expToNext(hero.level), atCap = hero.level >= levelCap(hero);
  return <button className={`hero-card ${selected ? 'selected' : ''}`} onClick={onClick}>
    <span className="hero-emoji"><HeroFace hero={hero} /></span>
    <span className="hero-card-info"><b>{hero.name}</b><small>{JOBS[hero.jobId].name} · Lv.{hero.level}</small>
      <span className="bar exp"><i style={{ width: `${atCap ? 100 : hero.exp / need * 100}%` }} /></span></span></button>;
}

export default function HeroPanel({ progress, onProgress }: { progress: Progress; onProgress: (p: Progress) => void }) {
  const [heroId, setHeroId] = useState(progress.heroes[0].id);
  const [slot, setSlot] = useState<Slot>('weapon');
  const hero = progress.heroes.find(h => h.id === heroId) ?? progress.heroes[0];
  const stats = heroStats(hero), bonus = equipmentBonus(hero.equipment);
  const cap = levelCap(hero), need = expToNext(hero.level), gated = atPromotionGate(hero);
  const owned = Object.entries(progress.inventory).map(([id, n]) => ({ item: ITEMS[id], n })).filter(x => x.item && x.item.slot === slot);
  const current = hero.equipment[slot] ? ITEMS[hero.equipment[slot]!] : undefined;
  return <div className="hero-panel">
    <div className="hero-list">{progress.heroes.map(h => <HeroCard key={h.id} hero={h} selected={h.id === hero.id} onClick={() => setHeroId(h.id)} />)}</div>
    <div className="hero-detail">
      <div className="hero-head"><div className="portrait big"><HeroFace hero={hero} /></div><div><h2>{hero.name} <small>{JOBS[hero.jobId].name}</small></h2>
        <div className="exp-line"><span>Lv.{hero.level}</span><span className="bar exp wide"><i style={{ width: `${hero.level >= cap ? 100 : hero.exp / need * 100}%` }} /></span>
          <small>{hero.level >= cap ? (gated ? '전직 필요' : 'MAX') : `${hero.exp} / ${need}`}</small></div>
        {hero.level < cap && <small className="muted">다음 레벨까지 {need - hero.exp} EXP</small>}
        {gated && <small className="warn-text">⚠ 전직 레벨에 도달했습니다. 전직·스킬 탭에서 시험에 도전하세요.</small>}</div></div>
      <div className="stat-table">{STAT_KEYS.map(k => <div key={k}><span>{STAT_LABEL[k]}</span><b>{stats[k]}</b>{bonus[k] > 0 && <small>(+{bonus[k]})</small>}</div>)}</div>
      <h4>장비</h4>
      <div className="slot-row">{SLOTS.map(s => { const it = hero.equipment[s] ? ITEMS[hero.equipment[s]!] : undefined;
        return <button key={s} className={`slot-btn ${slot === s ? 'selected' : ''}`} onClick={() => setSlot(s)}><span><ItemIcon item={it ?? { id: s, slot: s } as never} className="slot-ico" /> {SLOT_LABEL[s]}</span><b>{it ? it.name : '비어 있음'}</b><small>{it ? fmtStats(it.stats) : ''}</small></button>; })}</div>
      {current && <button className="link-btn" onClick={() => onProgress(unequip(progress, hero.id, slot))}>{SLOT_LABEL[slot]} 해제</button>}
      <h4>보유 {SLOT_LABEL[slot]} <small>({owned.reduce((a, x) => a + x.n, 0)}개)</small></h4>
      <div className="item-list">{owned.length === 0 && <p className="muted">보유한 {SLOT_LABEL[slot]} 장비가 없습니다. 전투 보상이나 상점에서 구하세요.</p>}
        {owned.map(({ item, n }) => {
          const err = equipError(hero, item), after = heroStats(hero, { ...hero.equipment, [slot]: item.id });
          return <div key={item.id} className={`item-row ${item.rarity}`}><ItemIcon item={item} className="item-ico" /><div className="item-main"><b>{item.name}{n > 1 ? ` ×${n}` : ''}</b><small>{fmtStats(item.stats)} · Lv.{item.minLevel}</small>
            <span className="diff">{STAT_KEYS.filter(k => after[k] !== stats[k]).map(k => <i key={k} className={after[k] > stats[k] ? 'up' : 'down'}>{STAT_LABEL[k]} {after[k] > stats[k] ? '▲' : '▼'}{Math.abs(after[k] - stats[k])}</i>)}</span></div>
            <button className="primary-btn small" disabled={!!err} title={err ?? ''} onClick={() => onProgress(equip(progress, hero.id, item.id))}>{err ?? '장착'}</button></div>;
        })}</div>
    </div>
  </div>;
}
