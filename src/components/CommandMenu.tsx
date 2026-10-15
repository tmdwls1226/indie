import { useState } from 'react';
import type { ActionType, Fighter } from '../engine/types';
import { SKILLS } from '../data/skills';
import { skillUsable } from '../engine/battleEngine';
import { Icon } from './Sprite';

type Props = { actor: Fighter; potions: number; onAction: (type: ActionType, skillId?: string) => void; disabled?: boolean };
const TARGET_LABEL: Record<string, string> = { enemy: '적 1명', allEnemies: '적 전체', ally: '아군 1명', allAllies: '아군 전체', self: '자신', deadAlly: '쓰러진 아군' };

export default function CommandMenu({ actor, potions, onAction, disabled }: Props) {
  const [view, setView] = useState<'main' | 'skills'>('main');
  const [hint, setHint] = useState('');
  const skills = actor.skills.map(id => SKILLS[id]).filter(Boolean);
  if (view === 'skills') {
    return <div className="command-skills">
      <div className="skill-list">{skills.map(s => {
        const why = skillUsable(actor, s);
        return <button key={s.id} className={`command-btn skill ${s.ultimate ? 'ultimate' : ''}`} disabled={disabled || !!why} onClick={() => { setView('main'); onAction('skill', s.id); }}
          onMouseEnter={() => setHint(s.detail)} onFocus={() => setHint(s.detail)} title={s.detail}>
          <span className="command-icon"><Icon name={`skill_${s.id}`} fallback={s.icon} /></span>
          <span className="command-copy"><b>{s.name}</b><small>{why ?? `MP ${s.mp}${s.cooldown ? ` · 재사용 ${s.cooldown}턴` : ''}`}</small></span>
        </button>;
      })}</div>
      <div className="skill-detail">{hint || '스킬에 마우스를 올리면 효과 설명이 표시됩니다.'}</div>
      <button className="link-btn" onClick={() => setView('main')}>← 돌아가기</button>
    </div>;
  }
  const anySkill = skills.some(s => !skillUsable(actor, s));
  return <div className="command-grid">
    <button className="command-btn attack" disabled={disabled} onClick={() => onAction('attack')} title="MP 소모 없는 기본 물리 공격">
      <span className="command-icon"><Icon name="cmd_attack" fallback="⚔" /></span><span className="command-copy"><b>공격</b><small>MP 소모 없음</small></span></button>
    <button className="command-btn skill-open" disabled={disabled || !anySkill} onClick={() => setView('skills')} title="장착한 스킬 목록">
      <span className="command-icon"><Icon name="cmd_skill" fallback="✦" /></span><span className="command-copy"><b>스킬</b><small>{skills.length}개 장착 · MP {actor.mp}</small></span></button>
    <button className="command-btn defend" disabled={disabled} onClick={() => onAction('defend')} title="이번 라운드 받는 피해 50% 감소 (가장 먼저 행동)">
      <span className="command-icon"><Icon name="cmd_defend" fallback="⬟" /></span><span className="command-copy"><b>방어</b><small>받는 피해 50% 감소</small></span></button>
    <button className="command-btn item" disabled={disabled || potions <= 0} onClick={() => onAction('item')} title="아군 1명의 HP 회복">
      <span className="command-icon"><Icon name="cmd_item" fallback="⚗" /></span><span className="command-copy"><b>아이템</b><small>물약 {potions}개 남음</small></span></button>
  </div>;
}
export { TARGET_LABEL };
