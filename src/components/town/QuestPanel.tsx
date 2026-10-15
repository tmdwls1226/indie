import type { Progress } from '../../engine/types';
import { QUESTS } from '../../data/quests';
import { ITEMS } from '../../data/items';
import { claimQuest, questDone, questProgress } from '../../engine/progression';

export default function QuestPanel({ progress, onProgress }: { progress: Progress; onProgress: (p: Progress) => void }) {
  const rows = QUESTS.map(q => ({ q, cur: Math.min(q.goal, questProgress(q, progress)), done: questDone(q, progress), claimed: progress.quests[q.id]?.claimed ?? false }));
  const order = (r: typeof rows[number]) => (r.claimed ? 2 : r.done ? 0 : 1);
  return <div className="quest-list">{rows.slice().sort((a, b) => order(a) - order(b)).map(({ q, cur, done, claimed }) => <div key={q.id} className={`quest-row ${done ? 'done' : ''} ${claimed ? 'claimed' : ''}`}>
    <div className="quest-main"><b>{q.name}</b><small>{q.desc}</small>
      <span className="bar exp wide"><i style={{ width: `${cur / q.goal * 100}%` }} /></span><em>{cur} / {q.goal}</em></div>
    <div className="quest-reward"><small>보상</small><span>💰 {q.reward.gold}{q.reward.exp ? ` · EXP ${q.reward.exp}` : ''}{q.reward.item ? ` · ${ITEMS[q.reward.item]?.name}` : ''}</span>
      <button className="primary-btn small" disabled={!done || claimed} onClick={() => onProgress(claimQuest(progress, q.id))}>{claimed ? '수령 완료' : done ? '보상 받기' : '진행 중'}</button></div></div>)}</div>;
}
