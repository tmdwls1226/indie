// Picks the right Korean particle (은/는, 이/가, 을/를, 와/과, 으로/로) from the final syllable of a word.
const lastCode = (w: string) => w.charCodeAt(w.length - 1) - 0xac00;
const hasBatchim = (w: string) => { const c = lastCode(w); return c >= 0 && c <= 11171 && c % 28 !== 0; };
const endsWithRieul = (w: string) => { const c = lastCode(w); return c >= 0 && c <= 11171 && c % 28 === 8; };
export type Josa = '은/는' | '이/가' | '을/를' | '와/과' | '으로/로';
export function josa(word: string, kind: Josa): string {
  const [withBatchim, without] = kind.split('/');
  if (kind === '으로/로') return word + (hasBatchim(word) && !endsWithRieul(word) ? withBatchim : without);
  return word + (hasBatchim(word) ? withBatchim : without);
}
