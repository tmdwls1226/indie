import type { Progress } from '../../engine/types';
import { STAGES, TRIALS, ZONES, type StageDef } from '../../data/stages';
import { MONSTERS } from '../../data/monsters';
import { isStageUnlocked } from '../../engine/game';
import { MonsterFace } from '../Sprite';

const enemyIcons = (s: StageDef) => s.enemies.map((e, i) => <MonsterFace key={i} templateId={e.t} className="foe" />);
export default function StageSelect({ progress, onStart }: { progress: Progress; onStart: (id: string) => void }) {
  const trials = TRIALS.filter(t => isStageUnlocked(progress, t.id));
  const avg = Math.round(progress.heroes.reduce((a, h) => a + h.level, 0) / progress.heroes.length);
  return <div className="stage-select">
    {trials.length > 0 && <div className="zone trial-zone"><h3>★ 전직 시험 <small>통과하면 전직할 수 있습니다</small></h3>
      <div className="stage-grid">{trials.map(t => <button key={t.id} className="stage-btn trial" onClick={() => onStart(t.id)}>
        <b>{t.name}</b><span className="stage-foes">{enemyIcons(t)}</span><small>Lv.{t.recommendedLevel} · 시험 보스</small></button>)}</div></div>}
    {ZONES.map(z => {
      const stages = STAGES.filter(s => s.zoneId === z.id);
      const open = isStageUnlocked(progress, stages[0].id);
      return <div key={z.id} className={`zone ${open ? '' : 'locked'}`}><h3>{z.name} <small>Lv.{z.minLv}–{z.maxLv} · {z.sub}</small></h3>
        <div className="stage-grid">{stages.map(s => {
          const unlocked = isStageUnlocked(progress, s.id), clears = progress.clearedStages[s.id] ?? 0, tooHard = s.recommendedLevel > avg + 4;
          return <button key={s.id} className={`stage-btn ${s.boss ? 'boss' : ''} ${clears ? 'cleared' : ''} ${tooHard && unlocked ? 'hard' : ''}`} disabled={!unlocked} onClick={() => onStart(s.id)} title={unlocked ? '' : '이전 스테이지를 클리어하세요'}>
            <b>{unlocked ? '' : '🔒 '}{s.boss ? '★ ' : ''}{s.name.replace(`${z.name} `, '')}</b><span className="stage-foes">{enemyIcons(s)}</span>
            <small>추천 Lv.{s.recommendedLevel}{clears ? ` · 클리어 ${clears}회` : ''}{tooHard && unlocked ? ' · 위험' : ''}</small></button>;
        })}</div></div>;
    })}
  </div>;
}
