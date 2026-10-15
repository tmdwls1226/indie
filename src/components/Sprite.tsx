import { useEffect, useState } from 'react';
import type { BaseClass, Fighter, Hero } from '../engine/types';
import type { ItemDef } from '../data/items';
import { SLOT_ICON } from '../data/items';
import { MONSTERS } from '../data/monsters';
import { fighterDirs, heroDirs, monsterDirs, resolveBackground, resolveIcon, resolveSprite, useAssets, type SpriteState } from '../assets/assets';
import { JOBS } from '../data/jobs';

function useFrameIndex(frames: string[], fps: number) {
  const [i, setI] = useState(0);
  const key = frames.join('|');
  useEffect(() => {
    setI(0);
    if (frames.length < 2) return;
    const t = window.setInterval(() => setI(x => x + 1), 1000 / fps);
    return () => window.clearInterval(t);
  }, [key, fps]);
  return frames.length ? i % frames.length : 0;
}
// Files that fail to decode are skipped for the rest of the session so a broken PNG never shows a broken-image icon.
const broken = new Set<string>();

interface SpriteProps { dirs: string[]; states: SpriteState[]; fallback: string; className?: string; fps?: number; }
/** Image from the first matching asset, otherwise the fallback text (emoji / glyph). */
export function Art({ dirs, states, fallback, className = '', fps = 4 }: SpriteProps) {
  useAssets();
  const frames = resolveSprite(dirs, states).filter(f => !broken.has(f));
  const idx = useFrameIndex(frames, fps);
  const [, force] = useState(0);
  if (!frames.length) return <span className={`pixel-person ${className}`}>{fallback}</span>;
  return <img className={`sprite-img ${className}`} src={frames[idx]} alt="" draggable={false} onError={() => { broken.add(frames[idx]); force(n => n + 1); }} />;
}
export const hasArt = (dirs: string[], states: SpriteState[]) => resolveSprite(dirs, states).filter(f => !broken.has(f)).length > 0;

/** Battle sprite for any fighter in the given animation state. */
export function FighterSprite({ fighter, state }: { fighter: Fighter; state: SpriteState }) {
  return <Art dirs={fighterDirs(fighter)} states={state === 'idle' ? ['idle'] : [state, 'idle']} fallback={fighter.emoji} fps={state === 'idle' ? 3 : 8} />;
}
/** Small face: portrait if available, else the idle sprite, else the emoji. */
export function FighterFace({ fighter, className = '' }: { fighter: Fighter; className?: string }) {
  return <Art dirs={fighterDirs(fighter)} states={['portrait', 'idle']} fallback={fighter.emoji} className={`face ${className}`} fps={3} />;
}
export function HeroFace({ hero, className = '' }: { hero: Hero; className?: string }) {
  return <Art dirs={heroDirs(hero.baseClass, hero.jobId)} states={['portrait', 'idle']} fallback={hero.emoji} className={`face ${className}`} fps={3} />;
}
export function ClassFace({ baseClass, jobId, emoji, className = '' }: { baseClass: BaseClass; jobId: string; emoji: string; className?: string }) {
  return <Art dirs={heroDirs(baseClass, jobId)} states={['portrait', 'idle']} fallback={emoji} className={`face ${className}`} fps={3} />;
}
export function MonsterFace({ templateId, className = '' }: { templateId: string; className?: string }) {
  const def = MONSTERS[templateId];
  return <Art dirs={monsterDirs(templateId, !!def?.boss)} states={['idle']} fallback={def?.emoji ?? '?'} className={`face ${className}`} fps={3} />;
}

/** UI icon (ui/icons/<name>.png) with a glyph fallback. */
export function Icon({ name, fallback, className = '' }: { name: string; fallback: string; className?: string }) {
  useAssets();
  const url = resolveIcon(name);
  const [bad, setBad] = useState(false);
  if (!url || bad) return <span className={className}>{fallback}</span>;
  return <img className={`icon-img ${className}`} src={url} alt="" draggable={false} onError={() => setBad(true)} />;
}
/** Item icon: item_<id>, then the slot's generic icon, then the slot emoji. */
export function ItemIcon({ item, className = '' }: { item: ItemDef; className?: string }) {
  useAssets();
  const url = resolveIcon(`item_${item.id}`) ?? resolveIcon(`slot_${item.slot}`);
  if (!url) return <span className={className}>{SLOT_ICON[item.slot]}</span>;
  return <img className={`icon-img ${className}`} src={url} alt="" draggable={false} />;
}
/** Background image URL for a zone / the town, or null when not supplied. */
export function useBackground(zoneId: string, kind: 'battle' | 'town'): string | null { useAssets(); return resolveBackground(zoneId, kind); }
export const jobBaseClass = (jobId: string): BaseClass => JOBS[jobId]?.baseClass ?? 'warrior';
