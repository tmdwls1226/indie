// Seeded RNG (mulberry32). The seed lives in the battle state so a saved battle replays identically after reload.
export function nextRandom(seed: number): { value: number; seed: number } {
  let t = (seed + 0x6d2b79f5) >>> 0;
  const out = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: out };
}
export const newSeed = () => (Math.random() * 4294967296) >>> 0;
