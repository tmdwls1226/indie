import type { Fighter } from '../engine/types';
import { STATUS_LABEL } from '../data/skills';
import { Icon } from './Sprite';

export default function StatusIcons({ fighter }: { fighter: Fighter }) {
  if (!fighter.statuses.length) return null;
  return <span className="status-icons">{fighter.statuses.map(s => {
    const l = STATUS_LABEL[s.type];
    const detail = s.type === 'barrier' ? ` (${s.value})` : s.type === 'burn' || s.type === 'regen' ? ` (${s.value}/턴)` : '';
    return <i key={s.type} className={`status-chip ${l.good ? 'good' : 'bad'}`} title={`${l.name}${detail} · ${s.turns}턴`}><Icon name={`status_${s.type}`} fallback={l.icon} /></i>;
  })}</span>;
}
