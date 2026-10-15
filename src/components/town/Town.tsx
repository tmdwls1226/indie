import { useState } from 'react';
import type { Progress } from '../../engine/types';
import StageSelect from './StageSelect';
import HeroPanel from './HeroPanel';
import JobPanel from './JobPanel';
import Shop from './Shop';
import QuestPanel from './QuestPanel';
import { useBackground } from '../Sprite';
import { TOWN_BG, TOWN_NAME } from '../../data/stages';
import { QUESTS } from '../../data/quests';
import { atPromotionGate, canPromote, questDone } from '../../engine/progression';

type Tab = 'stage' | 'hero' | 'job' | 'shop' | 'quest';
interface Props { progress: Progress; onProgress: (p: Progress) => void; onStart: (stageId: string) => void; onOpenSettings: () => void; }
export default function Town({ progress, onProgress, onStart, onOpenSettings }: Props) {
  const [tab, setTab] = useState<Tab>('stage');
  const townBg = useBackground(TOWN_BG, 'town');
  const promoReady = progress.heroes.some(h => canPromote(h, progress.trialsCleared)), trialDue = progress.heroes.some(atPromotionGate);
  const claimable = QUESTS.filter(q => questDone(q, progress) && !progress.quests[q.id]?.claimed).length;
  const tabs: { id: Tab; label: string; badge?: string }[] = [
    { id: 'stage', label: '⚔ 출전' }, { id: 'hero', label: '🛡 영웅·장비' },
    { id: 'job', label: '✦ 전직·스킬', badge: promoReady ? '전직!' : trialDue ? '시험' : undefined },
    { id: 'shop', label: '💰 상점' }, { id: 'quest', label: '📜 퀘스트', badge: claimable ? String(claimable) : undefined }
  ];
  return <>
    <header className="topbar"><div className="brand-mark">⚔</div><div className="brand">TURNBOUND<span>PIXEL RPG</span></div>
      <div className="location"><b>TOWN</b><small>마을 · 출전 준비</small></div><div className="top-spacer" />
      <div className="gold-tag big">💰 {progress.gold.toLocaleString()} G</div>
      <button className="settings-btn" onClick={onOpenSettings} aria-label="설정">⚙</button></header>
    {townBg && <div className="town-banner" style={{ backgroundImage: `url(${townBg})` }}><b>{TOWN_NAME}</b><small>모험의 출발점 · 출전 준비</small></div>}
    <nav className="town-tabs">{tabs.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}{t.badge && <i className="badge">{t.badge}</i>}</button>)}</nav>
    <section className="panel town-body">
      {tab === 'stage' && <StageSelect progress={progress} onStart={onStart} />}
      {tab === 'hero' && <HeroPanel progress={progress} onProgress={onProgress} />}
      {tab === 'job' && <JobPanel progress={progress} onProgress={onProgress} onStart={id => { onStart(id); }} />}
      {tab === 'shop' && <Shop progress={progress} onProgress={onProgress} />}
      {tab === 'quest' && <QuestPanel progress={progress} onProgress={onProgress} />}
    </section>
    <section className="party-strip"><div className="strip-title">PARTY <span>클리어 {Object.keys(progress.clearedStages).length}개 스테이지 · 승리 {progress.battlesWon}회 · 패배 {progress.battlesLost}회</span></div></section>
  </>;
}
