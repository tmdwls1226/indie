import { useEffect, useRef, useState } from 'react';
import BattleScreen from './components/BattleScreen';
import Town from './components/town/Town';
import SettingsModal, { type DebugAction } from './components/SettingsModal';
import { createBattle } from './engine/battleEngine';
import { applyBattleResult, isStageUnlocked } from './engine/game';
import { DEFAULT_SETTINGS, clearSave, loadBackup, loadGame, saveGame, type Session, type Settings, type Speed } from './engine/save';
import { createInitialProgress, levelCap } from './engine/progression';
import { JOBS, PROMOTION_LEVELS } from './data/jobs';
import { STAGES, STAGE_BY_ID, nextStageId } from './data/stages';
import type { BattleState, PlannedAction, Progress } from './engine/types';

const AUTOSAVE_INTERVAL_MS = 30000;
const clock = (t: number) => new Date(t).toLocaleTimeString('ko-KR', { hour12: false });

export default function App() {
  const [boot] = useState(() => loadGame());
  const [progress, setProgress] = useState<Progress>(() => boot.data?.progress ?? createInitialProgress());
  const [session, setSession] = useState<Session | null>(() => boot.data?.session ?? null);
  const [screen, setScreen] = useState<'town' | 'battle'>(() => boot.data?.screen ?? 'town');
  const [settings, setSettings] = useState<Settings>(() => boot.data?.settings ?? { ...DEFAULT_SETTINGS });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState(() => boot.source === 'backup' ? '저장 데이터가 손상되어 백업에서 복구했습니다.' : boot.migrated ? '이전 버전 저장 데이터를 새 성장 시스템으로 변환했습니다.' : boot.mainDamaged ? '저장 데이터가 손상되어 새로 시작합니다.' : '');
  const [saveInfo, setSaveInfo] = useState<{ ok: boolean; label: string; time: number } | null>(null);

  // Save on every state change (mid-battle plans, battle end, rewards, level-ups, gear, promotions), on a timer, and when the tab is hidden or closed.
  const latest = useRef({ screen, progress, session, settings });
  latest.current = { screen, progress, session, settings };
  function persist(label: string) { const ok = saveGame(latest.current); setSaveInfo({ ok, label, time: Date.now() }); return ok; }
  useEffect(() => { persist(session?.battle.phase === 'victory' || session?.battle.phase === 'defeat' ? '전투 종료 저장' : '자동 저장'); }, [progress, session, screen, settings]);
  useEffect(() => {
    const timer = window.setInterval(() => persist('주기 저장'), AUTOSAVE_INTERVAL_MS);
    const onHide = () => { if (document.visibilityState === 'hidden') persist('종료 저장'); };
    const onUnload = () => { persist('종료 저장'); };
    document.addEventListener('visibilitychange', onHide); window.addEventListener('pagehide', onUnload);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', onUnload); };
  }, []);

  function startStage(stageId: string) {
    const stage = STAGE_BY_ID[stageId]; if (!stage || !isStageUnlocked(progress, stageId)) return;
    setSession({ id: Date.now(), stageId, battle: createBattle(progress.heroes, stage), pending: [] });
    setScreen('battle'); setNotice('');
  }
  // Rewards are settled the moment the round resolves, so a refresh during the replay never loses or double-counts them.
  function onResolve(next: BattleState, _planned: PlannedAction[]) {
    if (!session) return;
    if (next.phase === 'victory' || next.phase === 'defeat') {
      const res = applyBattleResult(progress, STAGE_BY_ID[session.stageId], next);
      setProgress(res.progress); setSession({ ...session, battle: next, pending: [], reward: res.reward });
    } else setSession({ ...session, battle: next, pending: [] });
  }
  const leaveToTown = () => { setSession(null); setScreen('town'); };
  const stage = session ? STAGE_BY_ID[session.stageId] : undefined;
  const next = session ? nextStageId(session.stageId) : undefined;
  const canNext = !!next && isStageUnlocked(progress, next);

  function restoreBackup() {
    const data = loadBackup(); if (!data) { setNotice('복구할 백업이 없습니다.'); return; }
    setProgress(data.progress); setSession(data.session); setScreen(data.screen); setSettings(data.settings);
    setNotice(`백업에서 복구했습니다. (${clock(data.savedAt)} 저장분)`); setSettingsOpen(false);
  }
  function newGame() {
    if (!window.confirm('저장 데이터를 모두 삭제하고 새로 시작할까요?')) return;
    clearSave(); setProgress(createInitialProgress()); setSession(null); setScreen('town'); setSettingsOpen(false); setNotice('새 게임을 시작했습니다.');
  }
  function retreat() { if (window.confirm('전투를 포기하고 마을로 돌아갑니다. 보상은 받지 못합니다.')) { leaveToTown(); setSettingsOpen(false); } }
  function debug(a: DebugAction) {
    if (a === 'gold') setProgress(p => ({ ...p, gold: p.gold + 1000 }));
    if (a === 'level') setProgress(p => ({ ...p, heroes: p.heroes.map(h => { const cap = levelCap(h); const target = Math.min(cap, h.level + 10); return { ...h, level: target, exp: 0 }; }) }));
    if (a === 'trials') setProgress(p => ({ ...p, trialsCleared: [...new Set([...p.trialsCleared, ...p.heroes.map(h => JOBS[h.jobId].tier + 1).filter(t => t <= PROMOTION_LEVELS.length)])] }));
    if (a === 'unlock') setProgress(p => ({ ...p, clearedStages: { ...Object.fromEntries(STAGES.map(s => [s.id, p.clearedStages[s.id] ?? 1])) } }));
  }

  return <main className="game-shell">
    {notice && <div className="notice-bar" onClick={() => setNotice('')}>{notice} <small>(클릭해서 닫기)</small></div>}
    {screen === 'battle' && session && stage
      ? <BattleScreen key={session.id} progress={progress} session={session} stage={stage} speed={settings.speed} paused={settingsOpen} canNext={canNext}
        onSession={setSession} onResolve={onResolve} onNext={() => next && startStage(next)} onRetry={() => startStage(session.stageId)} onTown={leaveToTown} onOpenSettings={() => setSettingsOpen(true)} />
      : <Town progress={progress} onProgress={setProgress} onStart={startStage} onOpenSettings={() => setSettingsOpen(true)} />}
    {settingsOpen && <SettingsModal inBattle={screen === 'battle'} saveOk={saveInfo?.ok ?? true} saveText={saveInfo ? `${saveInfo.ok ? '● ' + saveInfo.label : '⚠ 저장 실패 (브라우저 저장소를 확인하세요)'} · ${clock(saveInfo.time)}` : '저장 기록 없음'}
      speed={settings.speed} onSpeed={(speed: Speed) => setSettings({ ...settings, speed })} onSave={() => persist('수동 저장')} onRestore={restoreBackup} onNewGame={newGame} onRetreat={retreat}
      onDebug={debug} onClose={() => setSettingsOpen(false)} />}
    <footer className="footer"><span>TURNBOUND <b>·</b> v0.2 {saveInfo && <><b>·</b> {saveInfo.ok ? `${saveInfo.label} ${clock(saveInfo.time)}` : '저장 실패'}</>}</span><span>SINGLE PLAYER</span></footer>
  </main>;
}
