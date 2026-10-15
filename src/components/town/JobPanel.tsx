import { useState } from 'react';
import type { Progress } from '../../engine/types';
import { JOBS, PROMOTION_LEVELS, childJobs, gateLevel, jobPath, type JobDef } from '../../data/jobs';
import { SKILLS } from '../../data/skills';
import { STAGE_BY_ID } from '../../data/stages';
import { atPromotionGate, canPromote, jobOf, learnedSkills, promote, skillSlots, toggleSkill, trialsNeeded } from '../../engine/progression';
import { isStageUnlocked } from '../../engine/game';
import { HeroCard } from './HeroPanel';
import { josa } from '../../engine/korean';
import { Icon } from '../Sprite';

const TIER_LABEL = ['초보자', '1차 전직', '2차 전직', '3차 전직', '최종 전직'];
function SkillRow({ id, equipped, locked, onClick, from }: { id: string; equipped?: boolean; locked?: boolean; onClick?: () => void; from?: string }) {
  const s = SKILLS[id]; if (!s) return null;
  return <button className={`skill-row ${equipped ? 'equipped' : ''} ${locked ? 'locked' : ''} ${s.ultimate ? 'ultimate' : ''}`} disabled={locked || !onClick} onClick={onClick}>
    <span className="skill-ico"><Icon name={`skill_${id}`} fallback={s.icon} /></span>
    <span className="skill-main"><b>{s.name}{s.ultimate ? ' ★' : ''}</b><small>{s.detail}</small>
      <em>MP {s.mp} · 재사용 {s.cooldown ? `${s.cooldown}턴` : '없음'}{from ? ` · ${from}` : ''}</em></span>
    <span className="skill-state">{locked ? '🔒' : equipped ? '장착 중' : '장착'}</span></button>;
}
export default function JobPanel({ progress, onProgress, onStart }: { progress: Progress; onProgress: (p: Progress) => void; onStart: (stageId: string) => void }) {
  const [heroId, setHeroId] = useState(progress.heroes[0].id);
  const hero = progress.heroes.find(h => h.id === heroId) ?? progress.heroes[0];
  const job = jobOf(hero), path = jobPath(hero.jobId), options = childJobs(hero.jobId);
  const gate = gateLevel(job.tier), atGate = atPromotionGate(hero), need = trialsNeeded(hero);
  const trialCleared = progress.trialsCleared.includes(need), trialId = `trial-${need}`;
  const slots = skillSlots(hero), learned = learnedSkills(hero);
  const owner: Record<string, string> = {}; for (const j of path) for (const s of j.skills) owner[s] = j.name;
  const tierCard = (t: number) => {
    const done = path[t] as JobDef | undefined;
    if (done) return <div key={t} className="tier-card done"><small>{TIER_LABEL[t]}{t > 0 ? ` · Lv.${PROMOTION_LEVELS[t - 1]}` : ''}</small><b>{done.name}</b><em>{done.branch}</em></div>;
    if (t === path.length) return <div key={t} className={`tier-card next ${atGate ? 'ready' : ''}`}><small>{TIER_LABEL[t]} · Lv.{PROMOTION_LEVELS[t - 1]}</small><b>{options.length ? options.map(o => o.name).join(' / ') : '—'}</b><em>{atGate ? (trialCleared ? '전직 가능' : '시험 필요') : '미도달'}</em></div>;
    return <div key={t} className="tier-card locked"><small>{TIER_LABEL[t]} · Lv.{PROMOTION_LEVELS[t - 1]}</small><b>???</b></div>;
  };
  return <div className="job-panel">
    <div className="hero-list">{progress.heroes.map(h => <HeroCard key={h.id} hero={h} selected={h.id === hero.id} onClick={() => setHeroId(h.id)} />)}</div>
    <div className="job-detail">
      <h3>{hero.name} · {job.name} <small>{job.branch} · Lv.{hero.level}</small></h3>
      <p className="muted">{job.desc}</p>
      <div className="tier-row">{[0, 1, 2, 3, 4].map(tierCard)}</div>
      {options.length > 0 && <div className="promo-box">
        <h4>전직 {atGate ? '' : <small>(Lv.{gate} 필요 · 현재 Lv.{hero.level})</small>}</h4>
        {!atGate && <p className="muted">레벨 {gate}에 도달하면 전직 시험에 도전할 수 있습니다. 전직 전에는 이 레벨 이상으로 성장하지 않습니다.</p>}
        {atGate && !trialCleared && <div className="trial-box"><p>전직하려면 시험을 통과해야 합니다: <b>{STAGE_BY_ID[trialId]?.name}</b></p>
          <button className="primary-btn" disabled={!isStageUnlocked(progress, trialId)} onClick={() => onStart(trialId)}>⚔ 시험 도전</button></div>}
        {atGate && trialCleared && <p className="ok-text">✔ 시험 통과! 전직할 직업을 선택하세요.</p>}
        <div className="option-grid">{options.map(o => <div key={o.id} className="option-card"><b>{o.name}</b><small>{o.branch}</small><p>{o.desc}</p>
          <div className="opt-stats">{(['hp', 'atk', 'def', 'spd'] as const).map(k => <span key={k}>{k.toUpperCase()} ×{o.mult[k]}</span>)}</div>
          <div className="opt-skills">{o.skills.map(s => <span key={s} className="skill-pill"><Icon name={`skill_${s}`} fallback={SKILLS[s]?.icon ?? ''} /> {SKILLS[s]?.name}</span>)}</div>
          <button className="primary-btn small" disabled={!canPromote(hero, progress.trialsCleared)} onClick={() => onProgress({ ...progress, heroes: progress.heroes.map(h => (h.id === hero.id ? promote(h, o.id) : h)) })}>{josa(o.name, '으로/로')} 전직</button></div>)}</div>
      </div>}
      {options.length === 0 && <p className="ok-text">★ 최종 전직을 완료했습니다.</p>}
      <h4>스킬 <small>장착 {hero.loadout.length}/{slots} 슬롯 · 전직 보상으로 해당 직업의 스킬을 모두 습득합니다</small></h4>
      <div className="skill-grid">{learned.map(id => <SkillRow key={id} id={id} equipped={hero.loadout.includes(id)} from={owner[id]}
        onClick={() => onProgress({ ...progress, heroes: progress.heroes.map(h => (h.id === hero.id ? toggleSkill(h, id) : h)) })} />)}</div>
      {options.length > 0 && <><h4>전직 시 습득 예정</h4><div className="skill-grid">{options.flatMap(o => o.skills.map(s => <SkillRow key={o.id + s} id={s} locked from={o.name} />))}</div></>}
      <small className="muted">슬롯은 3 → 4 → 5 → 6개로 늘어납니다. 현재 {slots}개.{JOBS[hero.jobId].tier < 4 ? '' : ' (최대)'}</small>
    </div>
  </div>;
}
