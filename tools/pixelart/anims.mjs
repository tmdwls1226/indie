// Animation definitions for the player characters. Each animation is a list of pose overrides, one per frame.
import { pose, CX, FOOT } from './players.mjs';
import { ground, rot90 } from './lib.mjs';

// What each character holds when standing at rest.
const REST = {
  leon: { weapon: { ang: 40, len: 21 }, handF: [1, 9] },
  elia: { weapon: { ang: -82, len: 26 }, handF: [3, 6] },
  serin: { weapon: { ang: -84, len: 28 }, handF: [3, 6] }
};
const robed = name => name !== 'leon';

export function frames(name) {
  const base = REST[name], mk = o => pose({ ...base, ...o, weapon: { ...base.weapon, ...(o.weapon ?? {}) } });
  const R = robed(name);
  const out = {};

  out.idle = [
    mk({ cape: 0, hem: 0, headDy: 0, weapon: { ang: base.weapon.ang } }),
    mk({ cape: 1, hem: 0, headDy: -1, weapon: { ang: base.weapon.ang - 2 } }),
    mk({ cape: 2, hem: 1, headDy: -1, weapon: { ang: base.weapon.ang - 3 } }),
    mk({ cape: 1, hem: 0, headDy: 0, weapon: { ang: base.weapon.ang - 1 } })
  ];
  out.walk = [
    mk({ legL: { x: -4, lift: 0 }, legR: { x: 4, lift: 3 }, lean: 1, cape: 2, hem: 1 }),
    mk({ legL: { x: -1, lift: 0 }, legR: { x: 1, lift: 0 }, dy: -1, lean: 1, cape: 1, hem: 0 }),
    mk({ legL: { x: -4, lift: 3 }, legR: { x: 4, lift: 0 }, lean: 1, cape: 2, hem: -1 }),
    mk({ legL: { x: -1, lift: 0 }, legR: { x: 1, lift: 0 }, dy: -1, lean: 1, cape: 1, hem: 0 })
  ];

  if (name === 'leon') {
    out.attack = [
      mk({ weapon: { ang: -125 }, handF: [-2, -6], lean: -2, headDx: -1, cape: -1 }),
      mk({ weapon: { ang: -20 }, handF: [4, 2], lean: 2, dx: 3, cape: 2, legL: { x: -4, lift: 0 }, legR: { x: 5, lift: 0 } }),
      mk({ weapon: { ang: 20 }, handF: [6, 6], lean: 4, dx: 5, cape: 3, mouth: 1, legL: { x: -5, lift: 0 }, legR: { x: 6, lift: 0 } }),
      mk({ weapon: { ang: 42 }, handF: [5, 9], lean: 3, dx: 4, cape: 2, legL: { x: -4, lift: 0 }, legR: { x: 5, lift: 0 } })
    ];
    out.skill = [
      mk({ weapon: { ang: -100, glow: 0.5 }, handF: [-1, -7], lean: -1, sparks: 2 }),
      mk({ weapon: { ang: -90, len: 22, glow: 1 }, handF: [0, -9], headDy: -1, sparks: 4 }),
      mk({ weapon: { ang: 5, glow: 1 }, handF: [7, 4], lean: 3, dx: 3, cape: 3, mouth: 1, sparks: 3 }),
      mk({ weapon: { ang: 25, glow: 0.6 }, handF: [6, 7], lean: 3, dx: 3, cape: 2, sparks: 1 })
    ];
  } else if (name === 'elia') {
    out.attack = [
      mk({ weapon: { ang: -60, glow: 0.4 }, handF: [4, 3], lean: -1, hem: -1 }),
      mk({ weapon: { ang: -20, glow: 0.8 }, handF: [6, 2], lean: 2, dx: 2, sparks: 2, hem: 1 }),
      mk({ weapon: { ang: -8, glow: 1 }, handF: [8, 1], lean: 3, dx: 3, mouth: 1, sparks: 4, hem: 1 }),
      mk({ weapon: { ang: -45, glow: 0.3 }, handF: [5, 3], lean: 1, dx: 1 })
    ];
    out.skill = [
      mk({ weapon: { ang: -88, glow: 0.5 }, handF: [3, -2], headDy: -1, sparks: 1 }),
      mk({ weapon: { ang: -88, glow: 1 }, handF: [3, -4], headDy: -2, hem: 1, sparks: 4 }),
      mk({ weapon: { ang: -88, glow: 1 }, handF: [3, -4], headDy: -2, hem: -1, mouth: 1, sparks: 6 }),
      mk({ weapon: { ang: -88, glow: 0.6 }, handF: [3, -2], headDy: -1, sparks: 3 })
    ];
  } else {
    out.attack = [
      mk({ weapon: { ang: -120, len: 28 }, handF: [-1, -5], lean: -2, hem: -1 }),
      mk({ weapon: { ang: -35 }, handF: [4, 0], lean: 2, dx: 2, hem: 1 }),
      mk({ weapon: { ang: 22, glow: 0.8 }, handF: [7, 6], lean: 4, dx: 4, mouth: 1, sparks: 3, hem: 1 }),
      mk({ weapon: { ang: 10 }, handF: [4, 6], lean: 2, dx: 2 })
    ];
    out.skill = [
      mk({ weapon: { ang: -88, glow: 0.5 }, handF: [3, -2], headDy: -1, sparks: 1 }),
      mk({ weapon: { ang: -88, glow: 1 }, handF: [3, -4], headDy: -2, hem: 1, sparks: 4 }),
      mk({ weapon: { ang: -88, glow: 1 }, handF: [3, -4], headDy: -2, hem: -1, sparks: 6 }),
      mk({ weapon: { ang: -88, glow: 0.5 }, handF: [3, -2], headDy: -1, sparks: 2 })
    ];
  }

  out.hurt = [
    mk({ flash: 0.55, lean: -4, dx: -3, eyes: 'closed', mouth: 1, headDy: 1, weapon: { ang: R ? -70 : 25 }, handF: R ? [2, 8] : [0, 10] }),
    mk({ lean: -2, dx: -2, eyes: 'closed', mouth: 1, weapon: { ang: R ? -76 : 30 } })
  ];
  const fallen = o => mk({ eyes: 'x', mouth: 1, ...o });
  out.dead = [
    fallen({ sink: 5, lean: -3, headDy: 2, dx: -1, weapon: { ang: R ? -55 : 12, len: R ? 26 : 13 }, handF: R ? [1, 9] : [3, 10], legL: { x: -3, lift: 0 }, legR: { x: 4, lift: 0 } }),
    fallen({ sink: 9, lean: -7, headDy: 5, dx: -2, weapon: { ang: R ? -25 : 8, len: R ? 22 : 13 }, handF: [2, 10] }),
    'lying'
  ];
  return out;
}

/** Lying pose: the collapsed body turned 90 degrees (head to the left) and resting on the ground line. */
export function lying(img) { return ground(rot90(img, false), CX + 6, FOOT); }
/** Upright pose that, once turned 90 degrees, leaves the weapon resting along the ground beside the body. */
export const lyingPose = name => pose({ ...REST[name], eyes: 'x', mouth: 1, headDy: 2, lean: -1, weapon: { ang: 90, len: name === 'leon' ? 18 : 20 }, handF: [3, 10] });
