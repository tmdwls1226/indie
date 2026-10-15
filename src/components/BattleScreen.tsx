import { useEffect, useMemo, useState } from 'react';
import CharacterStatus from './CharacterStatus';
import CommandMenu from './CommandMenu';
import BattleLog from './BattleLog';
import RewardPanel from './RewardPanel';
import StatusIcons from './StatusIcons';
import { FighterFace, FighterSprite, hasArt, useBackground } from './Sprite';
import type { ActionType, BattleLogEntry, BattleState, BattleStep, Fighter, PlannedAction, Progress } from '../engine/types';
import type { Session, Speed } from '../engine/save';
import { backgroundFor, type StageDef } from '../data/stages';
import { fighterDirs, fighterState } from '../assets/assets';
import { SKILLS } from '../data/skills';
import { JOBS } from '../data/jobs';
import { effSpd, getStatus, getTurnOrder, resolveRound } from '../engine/battleEngine';
import { autoPlanAll } from '../engine/ai';
import { josa } from '../engine/korean';

const STEP_MS: Record<Speed, number> = { slow: 1100, normal: 700, fast: 380, instant: 0 };
type Targeting = { type: ActionType; skillId?: string; kind: 'enemy' | 'ally' | 'dead' } | null;
interface Playback { steps: BattleStep[]; index: number; baseLogs: BattleLogEntry[]; }

interface Props {
  progress: Progress; session: Session; stage: StageDef; speed: Speed; paused: boolean; canNext: boolean;
  onSession: (s: Session) => void;
  onResolve: (next: BattleState, planned: PlannedAction[]) => void;
  onNext: () => void; onRetry: () => void; onTown: () => void; onOpenSettings: () => void;
}
const canAct = (f: Fighter) => f.alive && !getStatus(f, 'freeze') && !getStatus(f, 'stun');

export default function BattleScreen({ session, stage, speed, paused, canNext, progress, onSession, onResolve, onNext, onRetry, onTown, onOpenSettings }: Props) {
  const battle = session.battle, pending = session.pending;
  const [targeting, setTargeting] = useState<Targeting>(null);
  const [message, setMessage] = useState('행동을 선택하세요.');
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [auto, setAuto] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const frame = playback ? playback.steps[playback.index] : null;
  const fighters = frame ? frame.fighters : battle.fighters;
  const logs = playback ? [...playback.baseLogs, ...playback.steps.slice(0, playback.index + 1).flatMap(s => s.logs)] : battle.logs;
  const potions = frame ? frame.potions : battle.potions;
  const popups = frame?.popups ?? [];
  const animating = playback !== null;
  const [animKind, animA, animB] = (frame?.animation ?? '').split('|');
  const allies = fighters.filter(f => f.side === 'ally'), enemies = fighters.filter(f => f.side === 'enemy');
  const active = allies.find(f => f.id === battle.selectedId && f.alive) ?? allies.find(f => f.alive);
  const bg = useBackground(backgroundFor(stage), 'battle');
  const view: BattleState = useMemo(() => ({ ...battle, fighters }), [battle, fighters]);
  const order = useMemo(() => getTurnOrder(view), [view]);
  const pendingIds = new Set(pending.map(p => p.actorId));
  const planning = battle.phase === 'planning' && !animating;
  const reservedPotions = pending.filter(p => p.type === 'item' && p.actorId !== active?.id).length;
  const shownPhase = animating ? 'resolving' : battle.phase;
  const ended = !animating && (battle.phase === 'victory' || battle.phase === 'defeat');

  // ---- round playback: each step is one visible beat; the committed state is already final ----
  useEffect(() => {
    if (!playback || paused) return;
    const last = playback.index >= playback.steps.length - 1;
    const step = playback.steps[playback.index];
    const base = STEP_MS[speed] || 1;
    const delay = (step.banner ? base * 2.2 : base) * (last ? 1.2 : 1);
    const t = window.setTimeout(() => setPlayback(p => (p ? (last ? null : { ...p, index: p.index + 1 }) : p)), delay);
    return () => window.clearTimeout(t);
  }, [playback, paused, speed]);

  function setSelected(id: string) { onSession({ ...session, battle: { ...battle, selectedId: id } }); }
  function queue(action: PlannedAction) {
    const actor = battle.fighters.find(f => f.id === action.actorId);
    const nextHero = battle.fighters.find(f => f.side === 'ally' && canAct(f) && f.id !== action.actorId && !pendingIds.has(f.id));
    onSession({ ...session, pending: [...pending.filter(p => p.actorId !== action.actorId), action], battle: nextHero ? { ...battle, selectedId: nextHero.id } : battle });
    setTargeting(null); setMessage(`${actor?.name ?? ''} 행동 확정`);
  }
  function chooseAction(type: ActionType, skillId?: string) {
    if (!active || !planning) return;
    if (type === 'defend') { queue({ actorId: active.id, type }); return; }
    if (type === 'item') { setMessage('회복할 아군을 선택하세요.'); setTargeting({ type, kind: 'ally' }); return; }
    if (type === 'attack') { setMessage('공격할 적을 선택하세요.'); setTargeting({ type, kind: 'enemy' }); return; }
    const skill = skillId ? SKILLS[skillId] : undefined; if (!skill) return;
    if (skill.target === 'enemy') { setMessage(`${skill.name}: 공격할 적을 선택하세요.`); setTargeting({ type, skillId, kind: 'enemy' }); }
    else if (skill.target === 'ally') { setMessage(`${skill.name}: 대상 아군을 선택하세요.`); setTargeting({ type, skillId, kind: 'ally' }); }
    else if (skill.target === 'deadAlly') {
      if (!allies.some(f => !f.alive)) { setMessage('쓰러진 아군이 없습니다.'); return; }
      setMessage(`${skill.name}: 쓰러진 아군을 선택하세요.`); setTargeting({ type, skillId, kind: 'dead' });
    } else queue({ actorId: active.id, type, skillId });
  }
  function selectTarget(target: Fighter) {
    if (!targeting || !active) return;
    queue({ actorId: active.id, type: targeting.type, skillId: targeting.skillId, targetId: target.id });
  }
  function executeRound() {
    if (battle.phase !== 'planning' || playback) return;
    const unassigned = battle.fighters.filter(f => f.side === 'ally' && f.alive && !pendingIds.has(f.id)).map(f => f.id);
    const planned = [...pending, ...autoPlanAll(battle, unassigned, pending.filter(p => p.type === 'item').length)];
    const result = resolveRound(battle, planned);
    setTargeting(null);
    setMessage(result.state.phase === 'victory' ? '전투에서 승리했습니다!' : result.state.phase === 'defeat' ? '파티가 전멸했습니다.' : '다음 라운드의 행동을 선택하세요.');
    onResolve(result.state, planned);
    if (speed !== 'instant') setPlayback({ steps: result.steps, index: 0, baseLogs: battle.logs });
  }
  function autoFill() {
    const unassigned = battle.fighters.filter(f => f.side === 'ally' && canAct(f) && !pendingIds.has(f.id)).map(f => f.id);
    if (!unassigned.length) return;
    onSession({ ...session, pending: [...pending, ...autoPlanAll(battle, unassigned, pending.filter(p => p.type === 'item').length)] });
    setMessage('남은 영웅의 행동을 자동으로 정했습니다.');
  }

  // ---- auto-battle ----
  useEffect(() => {
    if (!auto || !planning || paused || session.reward) return;
    const t = window.setTimeout(executeRound, speed === 'instant' ? 30 : 350);
    return () => window.clearTimeout(t);
  });
  useEffect(() => { if (battle.phase !== 'planning') setAuto(false); }, [battle.phase]);

  const unassignedCount = allies.filter(f => f.alive && !pendingIds.has(f.id)).length;
  const sprite = (f: Fighter, i: number, side: 'ally' | 'enemy') => {
    const role = side === 'ally' ? JOBS[f.job]?.baseClass ?? '' : f.job;
    const isActor = animKind !== 'heal' && animA === f.id && !!animKind;
    const hit = popups.some(p => p.targetId === f.id && (p.kind === 'damage' || p.kind === 'crit'));
    const glow = popups.some(p => p.targetId === f.id && p.kind === 'heal');
    const targetable = !!targeting && planning && ((side === 'enemy' && targeting.kind === 'enemy' && f.alive) || (side === 'ally' && ((targeting.kind === 'ally' && f.alive) || (targeting.kind === 'dead' && !f.alive))));
    const withArt = hasArt(fighterDirs(f), ['idle']);
    const clickable = targetable || (side === 'ally' && planning && f.alive && !targeting);
    const onClick = () => { if (targetable) selectTarget(f); else if (side === 'ally' && planning && f.alive) setSelected(f.id); };
    return <button key={f.id} className={`battle-sprite ${side}-sprite ${role} ${withArt ? 'img' : ''} ${f.boss ? 'boss' : ''} ${side === 'ally' && active?.id === f.id ? 'active-sprite' : ''} ${!f.alive ? 'fallen' : ''} ${targetable ? 'targetable' : ''} ${side === 'enemy' && targeting?.kind === 'enemy' ? 'enemy-target-mode' : ''} ${isActor ? 'animating' : ''} ${hit ? 'hit' : ''} ${glow ? 'healed' : ''}`}
      style={{ '--unit-index': i } as React.CSSProperties} onClick={onClick} disabled={!clickable}>
      <span className="sprite-shadow" /><FighterSprite fighter={f} state={fighterState(f, { acting: isActor, hit })} />
      <b>{f.name}{f.boss ? ' ★' : ''}<em className="lv-mini"> Lv{f.level}</em></b>
      <span className="enemy-mini-hp"><i style={{ width: `${f.hp / f.maxHp * 100}%` }} /></span>
      <StatusIcons fighter={f} />
      {side === 'ally' && active?.id === f.id && f.alive && <span className="select-caret">▼</span>}
      {targetable && <small className="target-hint">{targeting?.kind === 'enemy' ? '대상 선택' : targeting?.kind === 'dead' ? '부활' : '회복'}</small>}
      {popups.filter(p => p.targetId === f.id).map(p => <span key={p.key} className={`float-text ${p.kind}`}>{p.text}</span>)}
    </button>;
  };
  const actorBlocked = active && !canAct(active);

  return <>
    <header className="topbar"><div className="brand-mark">⚔</div><div className="brand">TURNBOUND<span>PIXEL RPG</span></div>
      <div className="location"><b>{stage.zoneName.toUpperCase()}</b><small>{stage.name} · 추천 Lv.{stage.recommendedLevel}{stage.boss ? ' · BOSS' : ''}</small></div><div className="top-spacer" />
      <div className={`phase-pill ${shownPhase}`}>{shownPhase === 'planning' ? '행동 선택' : shownPhase === 'resolving' ? '전투 진행' : shownPhase === 'victory' ? 'VICTORY' : 'DEFEAT'}</div>
      <div className="round-counter">ROUND <b>{(animating && battle.phase === 'planning' ? battle.round - 1 : battle.round).toString().padStart(2, '0')}</b></div>
      <button className="settings-btn" onClick={onOpenSettings} aria-label="설정">⚙</button></header>
    <section className="status-row"><div className="side-label"><span className="label-dot ally-dot" /> YOUR PARTY <small>아군 파티</small></div><div className="side-label enemy-label"><span className="label-dot enemy-dot" /> ENEMIES <small>적 몬스터</small></div></section>
    <section className={`battlefield ${bg ? 'has-bg' : ''}`} style={bg ? { backgroundImage: `url(${bg})` } : undefined}><div className="moon" /><div className="ruin ruin-left"><i /><i /><i /><span>⚑</span></div><div className="ruin ruin-right"><i /><i /><i /><span>♜</span></div><div className="battle-ground" />
      <div className="party-stage">{allies.map((f, i) => sprite(f, i, 'ally'))}</div>
      <div className="enemy-stage">{enemies.map((f, i) => sprite(f, i, 'enemy'))}</div>
      <div className="turn-order"><b>TURN ORDER</b>{order.map(f => <div key={f.id} className={`turn-chip ${f.side} ${f.id === active?.id ? 'current' : ''}`} title={`${f.name} (SPD ${Math.round(effSpd(f))})`}><span><FighterFace fighter={f} /></span><small>{Math.round(effSpd(f))}</small></div>)}</div>
      {frame?.banner && <div className="skill-banner" key={frame.banner.title + playback?.index}><small>{frame.banner.sub}</small><b>{frame.banner.title}</b></div>}
      {animating && <button className="skip-btn" onClick={() => setPlayback(null)}>⏭ 연출 건너뛰기</button>}
    </section>
    <section className="bottom-grid">
      <div className="panel character-panel"><div className="panel-heading"><span>▣</span> CHARACTER STATUS <small>선택한 영웅</small></div>{active ? <><div className="character-summary"><div className={`portrait ${JOBS[active.job]?.baseClass}`}><FighterFace fighter={active} /></div><div className="character-details"><div className="name-row"><h2>{active.name}</h2><span>LV. {active.level} · {JOBS[active.job]?.name}</span></div>
        <div className="wide-stat"><span>HP</span><b>{active.hp} / {active.maxHp}</b></div><div className="bar hp"><i style={{ width: `${active.hp / active.maxHp * 100}%` }} /></div>
        <div className="wide-stat"><span>MP</span><b>{active.mp} / {active.maxMp}</b></div><div className="bar mp"><i style={{ width: `${active.maxMp ? active.mp / active.maxMp * 100 : 0}%` }} /></div></div></div>
        <div className="attributes"><span>⚔ ATK <b>{Math.round(active.atk)}</b></span><span>⬟ DEF <b>{Math.round(active.def)}</b></span><span>⌁ SPD <b>{Math.round(effSpd(active))}</b></span></div><StatusIcons fighter={active} /></> : <p>선택 가능한 영웅이 없습니다.</p>}</div>
      <div className="panel command-panel"><div className="panel-heading"><span>✦</span> ACTION SELECT <small>{pending.length}/{allies.filter(f => f.alive).length} 행동 확정</small></div>
        {active && planning ? (actorBlocked ? <div className="waiting-state">{josa(active.name, '은/는')} 행동 불가 상태입니다. (자동으로 턴을 넘깁니다)</div> : <CommandMenu key={active.id} actor={active} potions={potions - reservedPotions} onAction={chooseAction} />) : <div className="waiting-state">{shownPhase === 'resolving' ? '행동 진행 중…' : ended ? '전투 종료' : '전투 상태: ' + shownPhase}</div>}
        <div className="command-footer"><span className="hint-text">{animating ? '행동 진행 중…' : targeting ? message : pending.length ? `${pending.length}명의 행동이 준비됨` : message}</span>
          <span className="footer-actions"><button className={`mini-btn ${auto ? 'on' : ''}`} disabled={!planning && !auto} onClick={() => setAuto(a => !a)} title="매 라운드 자동으로 행동을 정하고 실행합니다">{auto ? '■ 자동 전투 중' : '▶ 자동 전투'}</button>
            <button className="mini-btn" disabled={!planning || unassignedCount === 0} onClick={autoFill} title="행동을 정하지 않은 영웅의 행동을 자동으로 정합니다">자동 행동</button>
            <button className="primary-btn" disabled={!planning} onClick={executeRound}>행동 실행{unassignedCount > 0 && pending.length > 0 ? ` (+${unassignedCount} 자동)` : ''} <span>▶</span></button></span></div>
      </div>
      <div className="panel log-panel"><div className="panel-heading"><span>▤</span> BATTLE LOG <small>전투 기록</small></div><BattleLog logs={logs} expanded={logOpen} />
        <div className="log-footer"><span>● {animating ? 'PLAYING' : 'READY'}</span><button onClick={() => setLogOpen(o => !o)}>{logOpen ? '▴ 접기' : '▾ 전체 기록'}</button></div></div>
    </section>
    <section className="party-strip"><div className="strip-title">PARTY MEMBERS <span>영웅을 선택해 명령을 지정하세요 · 지정하지 않은 영웅은 자동으로 행동합니다</span></div><div className="party-cards">{allies.map(f => <CharacterStatus key={f.id} fighter={f} selected={active?.id === f.id} pending={pendingIds.has(f.id)} onClick={() => planning && f.alive && setSelected(f.id)} />)}</div></section>
    {ended && session.reward && <RewardPanel reward={session.reward} progress={progress} canNext={canNext} onNext={onNext} onRetry={onRetry} onTown={onTown} />}
  </>;
}
