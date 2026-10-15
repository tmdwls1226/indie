import { useEffect, useRef } from 'react';
import type { BattleLogEntry } from '../engine/types';

const DOT: Record<string, string> = { heal: '✚', damage: '›', status: '✦', system: '◆' };
export default function BattleLog({ logs, expanded }: { logs: BattleLogEntry[]; expanded: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs, expanded]);
  const shown = expanded ? logs : logs.slice(-7);
  return <div className={`battle-log ${expanded ? 'expanded' : ''}`} ref={ref}>{shown.map(l => <div key={l.id} className={`log-line ${l.kind || ''}`}><span className="log-dot">{DOT[l.kind ?? ''] ?? '·'}</span>{l.text}</div>)}</div>;
}
