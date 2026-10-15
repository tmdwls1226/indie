import type { Speed } from '../engine/save';
import AssetStatus from './AssetStatus';

export type DebugAction = 'gold' | 'level' | 'trials' | 'unlock';
interface Props {
  inBattle: boolean; saveText: string; saveOk: boolean; speed: Speed;
  onSpeed: (s: Speed) => void; onSave: () => void; onRestore: () => void; onNewGame: () => void; onRetreat: () => void;
  onDebug: (a: DebugAction) => void; onClose: () => void;
}
const SPEEDS: { id: Speed; label: string }[] = [{ id: 'slow', label: '느림' }, { id: 'normal', label: '보통' }, { id: 'fast', label: '빠름' }, { id: 'instant', label: '즉시' }];
export default function SettingsModal(p: Props) {
  return <div className="settings-overlay" onClick={p.onClose}><div className="result-card settings-card" role="dialog" aria-label="설정" onClick={e => e.stopPropagation()}>
    <h2>SETTINGS</h2>
    <p className={`save-status ${p.saveOk ? '' : 'err'}`}>{p.saveText}</p>
    <div className="speed-row"><small>전투 연출 속도</small><div className="seg">{SPEEDS.map(s => <button key={s.id} className={p.speed === s.id ? 'on' : ''} onClick={() => p.onSpeed(s.id)}>{s.label}</button>)}</div></div>
    <div className="settings-actions">
      <button className="primary-btn" onClick={p.onSave}>💾 지금 저장</button>
      <button className="primary-btn" onClick={p.onRestore}>↺ 백업에서 복구</button>
      {p.inBattle && <button className="primary-btn" onClick={p.onRetreat}>🏃 전투 포기하고 마을로</button>}
      <button className="primary-btn" onClick={p.onNewGame}>⚠ 새 게임 (저장 삭제)</button>
      <AssetStatus />
      <details className="debug-box"><summary>테스트 도구</summary>
        <div className="settings-actions">
          <button className="mini-btn" onClick={() => p.onDebug('gold')}>+1,000 골드</button>
          <button className="mini-btn" onClick={() => p.onDebug('level')}>영웅 레벨 +10 (전직 관문까지)</button>
          <button className="mini-btn" onClick={() => p.onDebug('trials')}>전직 시험 즉시 통과 처리</button>
          <button className="mini-btn" onClick={() => p.onDebug('unlock')}>모든 스테이지 해금</button>
        </div></details>
      <button className="primary-btn" onClick={p.onClose}>닫기</button>
    </div></div></div>;
}
