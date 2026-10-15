import type { Progress, RewardSummary } from '../engine/types';
import { ITEMS } from '../data/items';
import { QUEST_BY_ID } from '../data/quests';
import { STAGE_BY_ID } from '../data/stages';
import { JOBS } from '../data/jobs';
import { atPromotionGate } from '../engine/progression';

type Props = { reward: RewardSummary; progress: Progress; canNext: boolean; onNext: () => void; onRetry: () => void; onTown: () => void };
export default function RewardPanel({ reward, progress, canNext, onNext, onRetry, onTown }: Props) {
  const stage = STAGE_BY_ID[reward.stageId];
  const gated = progress.heroes.filter(atPromotionGate);
  if (!reward.victory) {
    return <div className="result-overlay"><div className="result-card reward-card"><span className="result-icon">☠️</span><h2>DEFEAT</h2><p>파티가 전투 불능이 되었다. 장비와 레벨을 정비하고 다시 도전하세요.</p>
      <div className="reward-actions"><button className="primary-btn" onClick={onRetry}>↻ 다시 도전</button><button className="primary-btn" onClick={onTown}>🏠 마을로</button></div></div></div>;
  }
  return <div className="result-overlay"><div className="result-card reward-card">
    <span className="result-icon">🏆</span><h2>VICTORY!</h2><p>{stage?.name} 클리어</p>
    {reward.trialTier && <div className="reward-banner">★ {stage.name} 통과! 마을의 <b>전직·스킬</b> 탭에서 전직할 수 있습니다.</div>}
    <div className="reward-grid">
      <div><small>경험치</small><b className="exp">+{reward.exp} EXP</b>{reward.capped.length === progress.heroes.length && <small>전직 대기 중 · 레벨 상한</small>}</div>
      <div><small>골드</small><b className="gold">+{reward.gold} G</b></div>
    </div>
    {reward.drops.length > 0 && <div className="reward-block"><small>획득 장비</small>{reward.drops.map((d, i) => <span key={i} className={`drop-chip ${ITEMS[d]?.rarity}`}>{ITEMS[d]?.name}</span>)}</div>}
    {reward.levelUps.length > 0 && <div className="reward-block levelup"><small>레벨 업!</small>{reward.levelUps.map(l => <span key={l.heroId} className="levelup-chip">▲ {l.name} Lv.{l.from} → <b>Lv.{l.to}</b></span>)}</div>}
    {gated.length > 0 && !reward.trialTier && <div className="reward-banner warn">{gated.map(h => `${h.name}(${JOBS[h.jobId].name})`).join(', ')}: 전직 가능 레벨입니다. 전직 시험에 도전하세요.</div>}
    {reward.questsCompleted.length > 0 && <div className="reward-block"><small>퀘스트 완료</small>{reward.questsCompleted.map(q => <span key={q} className="quest-chip">✔ {QUEST_BY_ID[q]?.name}</span>)}</div>}
    {reward.newlyUnlockedStage && <div className="reward-banner">🔓 새 스테이지 해금: {STAGE_BY_ID[reward.newlyUnlockedStage]?.name}</div>}
    <div className="reward-actions">
      {canNext && <button className="primary-btn" onClick={onNext}>다음 전투 ▶</button>}
      <button className="primary-btn" onClick={onRetry}>↻ 같은 전투</button>
      <button className="primary-btn" onClick={onTown}>🏠 마을로</button>
    </div>
  </div></div>;
}
