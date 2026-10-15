import type { Fighter } from '../engine/types';
import { JOBS } from '../data/jobs';
import StatusIcons from './StatusIcons';
import { FighterFace } from './Sprite';

export default function CharacterStatus({ fighter, selected, pending, onClick }: { fighter: Fighter; selected?: boolean; pending?: boolean; onClick?: () => void }) {
  const hp = Math.max(0, fighter.hp) / fighter.maxHp * 100; const mp = fighter.maxMp ? fighter.mp / fighter.maxMp * 100 : 0;
  return <button className={`fighter-card ${fighter.side} ${selected ? 'selected' : ''} ${!fighter.alive ? 'dead' : ''} ${pending ? 'planned' : ''}`} onClick={onClick}>
    <div className="sprite" aria-hidden="true"><FighterFace fighter={fighter} /></div>
    <div className="fighter-info"><div className="fighter-name">{fighter.name} <small className="lv-tag">Lv.{fighter.level} {JOBS[fighter.job]?.name ?? ''}</small><span>{fighter.alive ? (pending ? '✔ 행동 확정' : '') : 'DOWN'}</span></div>
      <div className="statline"><span>HP</span><b>{fighter.hp}/{fighter.maxHp}</b></div><div className="bar hp"><i style={{ width: `${hp}%` }} /></div>
      <div className="statline mp-line"><span>MP</span><b>{fighter.mp}/{fighter.maxMp}</b></div><div className="bar mp"><i style={{ width: `${mp}%` }} /></div>
      <StatusIcons fighter={fighter} />
    </div>
  </button>;
}
