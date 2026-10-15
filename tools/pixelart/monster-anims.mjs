// Animation definitions for the eight common monsters: idle x4, move x4, attack x4, hit x2, dead x3.
import { pose, drawSlime, drawGoblin, drawSkeleton, drawBonePile, drawWolf, drawSpider, drawOrc, drawGolem, drawBat, MCX, MG } from './monsters.mjs';
import { ground, rot90 } from './lib.mjs';

const lyingOf = (img, dx = 4) => ground(rot90(img, false), MCX + dx, MG);

// Each entry: { draw, anims: { state: [frame builders] } }; a frame builder returns an Img.
function humanoid(draw, rest, extra) {
  const mk = o => pose({ ...rest, ...o, weapon: { ...rest.weapon, ...(o.weapon ?? {}) } });
  const a = extra(mk);
  return {
    idle: [mk({}), mk({ headDy: -1, weapon: { ang: rest.weapon.ang - 2 } }), mk({ headDy: -1, weapon: { ang: rest.weapon.ang - 3 } }), mk({ weapon: { ang: rest.weapon.ang - 1 } })].map(p => () => draw(p)),
    move: [
      mk({ legL: { x: -4, lift: 0 }, legR: { x: 4, lift: 3 }, lean: 1 }), mk({ legL: { x: -1, lift: 0 }, legR: { x: 1, lift: 0 }, dy: -1, lean: 1 }),
      mk({ legL: { x: -4, lift: 3 }, legR: { x: 4, lift: 0 }, lean: 1 }), mk({ legL: { x: -1, lift: 0 }, legR: { x: 1, lift: 0 }, dy: -1, lean: 1 })
    ].map(p => () => draw(p)),
    attack: a.attack.map(p => () => draw(p)),
    hit: [mk({ flash: 0.55, lean: -4, dx: -3, eyes: 'closed', mouth: 1, headDy: 1, weapon: { ang: rest.weapon.ang + 25 } }), mk({ lean: -2, dx: -2, eyes: 'closed', mouth: 1 })].map(p => () => draw(p)),
    dead: a.dead
  };
}

export const MONSTER_ANIMS = {
  slime: {
    idle: [[40, 28], [42, 26], [44, 24], [42, 26]].map(([w, h]) => () => drawSlime({ w, h })),
    move: [{ w: 36, h: 32 }, { w: 34, h: 36, dy: -7 }, { w: 34, h: 36, dy: -11 }, { w: 46, h: 22 }].map(p => () => drawSlime(p)),
    attack: [{ w: 46, h: 22, dx: -2 }, { w: 34, h: 34, dx: 8, dy: -3, mouth: 1 }, { w: 50, h: 18, dx: 12, mouth: 1 }, { w: 44, h: 24, dx: 6 }].map(p => () => drawSlime(p)),
    hit: [{ w: 48, h: 20, eyes: 'closed', flash: 0.55, dx: -3 }, { w: 44, h: 24, eyes: 'closed', dx: -2 }].map(p => () => drawSlime(p)),
    dead: [{ w: 48, h: 18, eyes: 'closed' }, { w: 54, h: 9 }, { w: 58, h: 5, drops: [[-24, -2], [22, -3]] }].map(p => () => drawSlime(p))
  },
  goblin: humanoid(drawGoblin, { weapon: { ang: -75, len: 24 }, handF: [3, 6] }, mk => ({
    attack: [mk({ weapon: { ang: -25, len: 22 }, handF: [-2, 4], lean: -2 }), mk({ weapon: { ang: -6, len: 22 }, handF: [5, 3], lean: 3, dx: 2, mouth: 1 }), mk({ weapon: { ang: -4, len: 19 }, handF: [6, 3], lean: 3, dx: 2, mouth: 1 }), mk({ weapon: { ang: -30, len: 22 }, handF: [4, 5], lean: 2, dx: 1 })],
    dead: [() => drawGoblin(mk({ sink: 4, lean: -3, headDy: 2, eyes: 'x', weapon: { ang: 20, len: 12 } })), () => drawGoblin(mk({ sink: 8, lean: -6, headDy: 4, eyes: 'x', weapon: { ang: 12, len: 11 } })), () => lyingOf(drawGoblin(mk({ eyes: 'x', mouth: 1, headDy: 1, weapon: { ang: 90, len: 18 }, handF: [3, 8] })))]
  })),
  skeleton: humanoid(drawSkeleton, { weapon: { ang: 40, len: 18 }, handF: [1, 8] }, mk => ({
    attack: [mk({ weapon: { ang: -125, len: 18 }, handF: [-2, -5], lean: -2 }), mk({ weapon: { ang: -20, len: 18 }, handF: [4, 2], lean: 2, dx: 2 }), mk({ weapon: { ang: 20, len: 18 }, handF: [6, 6], lean: 4, dx: 4 }), mk({ weapon: { ang: 55, len: 18 }, handF: [4, 8], lean: 3, dx: 3 })],
    dead: [() => drawSkeleton(mk({ sink: 4, lean: -3, headDy: 2, eyes: 'closed', weapon: { ang: 20, len: 12 } })), () => drawSkeleton(mk({ sink: 8, lean: -6, headDy: 4, eyes: 'closed', weapon: { ang: 12, len: 11 } })), () => drawBonePile()]
  })),
  wolf: {
    idle: [{ headDy: 0, tail: 0 }, { headDy: -1, tail: 2 }, { headDy: -1, tail: 3 }, { headDy: 0, tail: 2 }].map(p => () => drawWolf(p)),
    move: [{ legs: [3, -3, -3, 3], lift: [0, 0, 0, 3], tail: 3 }, { legs: [0, 0, 0, 0], dy: -1 }, { legs: [-3, 3, 3, -3], lift: [0, 3, 0, 0], tail: 3 }, { legs: [0, 0, 0, 0], dy: -1 }].map(p => () => drawWolf(p)),
    attack: [{ dx: -3, lean: -2, headDy: -2 }, { dx: 5, lean: 4, jaw: 3, legs: [2, -2, 2, -2] }, { dx: 9, lean: 5, jaw: 5, headDy: 2, legs: [3, -3, 3, -3] }, { dx: 4, lean: 2, jaw: 1 }].map(p => () => drawWolf(p)),
    hit: [{ lean: -3, dx: -3, eyes: 'closed', flash: 0.55, jaw: 2 }, { lean: -2, dx: -2, eyes: 'closed' }].map(p => () => drawWolf(p)),
    dead: [() => drawWolf({ lean: -5, dx: -3, headDy: 4, eyes: 'closed', legs: [-3, -3, 3, 3] }), () => drawWolf({ lean: -7, dx: -4, headDy: 7, eyes: 'closed', legs: [-4, -4, 4, 4], lift: [0, 2, 0, 2] }), () => drawWolf({ lying: true, dx: -2 })]
  },
  spider: {
    idle: [{ bob: 0 }, { bob: -1, feet: [1, 0, -1, 0] }, { bob: -1, feet: [0, 1, 0, -1] }, { bob: 0 }].map(p => () => drawSpider(p)),
    move: [{ feet: [3, -3, 3, -3] }, { feet: [0, 0, 0, 0], bob: -1 }, { feet: [-3, 3, -3, 3] }, { feet: [0, 0, 0, 0], bob: -1 }].map(p => () => drawSpider(p)),
    attack: [{ dx: -2, bob: 2, up: 0 }, { dx: 1, lunge: 3, up: 6, fang: 2 }, { dx: 2, lunge: 3, up: 8, fang: 4 }, { dx: 3, lunge: 2, up: 3, fang: 1 }].map(p => () => drawSpider(p)),
    hit: [{ eyes: 'closed', flash: 0.55, dx: -3, bob: 2 }, { eyes: 'closed', dx: -2, bob: 1 }].map(p => () => drawSpider(p)),
    dead: [{ eyes: 'closed', bob: 2, dx: -2 }, { eyes: 'closed', bob: 4, dx: -2, feet: [-3, -2, -1, 0] }, { dead: true, eyes: 'closed', bob: 2 }].map(p => () => drawSpider(p))
  },
  orc: humanoid(drawOrc, { weapon: { ang: -70, len: 24 }, handF: [3, 4] }, mk => ({
    attack: [mk({ weapon: { ang: -115, len: 19 }, handF: [-3, -4], lean: -3, headDx: -1 }), mk({ weapon: { ang: -45, len: 22 }, handF: [4, -2], lean: 2, dx: 2 }), mk({ weapon: { ang: 38, len: 20 }, handF: [5, 8], lean: 3, dx: 2, mouth: 1 }), mk({ weapon: { ang: 60, len: 22 }, handF: [5, 8], lean: 3, dx: 3 })],
    dead: [() => drawOrc(mk({ sink: 5, lean: -3, headDy: 3, eyes: 'closed', weapon: { ang: 20, len: 14 } })), () => drawOrc(mk({ sink: 10, lean: -6, headDy: 6, eyes: 'closed', weapon: { ang: 12, len: 12 } })), () => lyingOf(drawOrc(mk({ eyes: 'closed', mouth: 1, headDy: 2, weapon: { ang: 90, len: 20 }, handF: [3, 10] })), 6)]
  })),
  golem: (() => {
    const mk = o => pose({ handF: [0, 14], handB: [0, 14], eyes: 'open', ...o });
    const g = p => () => drawGolem(p);
    return {
      idle: [mk({}), mk({ headDy: -1 }), mk({ headDy: -1, handF: [0, 13], handB: [0, 13] }), mk({})].map(g),
      move: [mk({ lean: 2, legL: { x: -3, lift: 0 }, legR: { x: 3, lift: 4 } }), mk({ dy: -1, lean: 1 }), mk({ lean: -2, legL: { x: -3, lift: 4 }, legR: { x: 3, lift: 0 } }), mk({ dy: -1, lean: -1 })].map(g),
      attack: [mk({ handF: [3, -17], handB: [-3, -17], lean: -2 }), mk({ handF: [6, -18], handB: [-2, -22], lean: 1, dx: 1 }), mk({ handF: [12, 10], handB: [8, 12], lean: 5, dx: 4 }), mk({ handF: [8, 12], handB: [4, 12], lean: 3, dx: 2 })].map(g),
      hit: [mk({ flash: 0.55, lean: -4, dx: -3, eyes: 'closed' }), mk({ lean: -2, dx: -2, eyes: 'closed' })].map(g),
      dead: [mk({ sink: 6, lean: -3, headDy: 3, eyes: 'closed', handF: [0, 14], handB: [0, 14] }), { ...mk({}), rubble: 2, glowBits: 3 }, { ...mk({}), rubble: 4, glowBits: 0 }].map(g)
    };
  })(),
  bat: {
    idle: [{ wing: 10, cy: 32 }, { wing: 2, cy: 33 }, { wing: -8, cy: 34 }, { wing: 2, cy: 33 }].map(p => () => drawBat(p)),
    move: [{ wing: 14, cy: 31, dx: 0 }, { wing: 0, cy: 34 }, { wing: -12, cy: 36 }, { wing: 0, cy: 34 }].map(p => () => drawBat(p)),
    attack: [{ wing: 12, cy: 28, dx: -2 }, { wing: -10, cy: 38, dx: 8, mouth: 1 }, { wing: -4, cy: 44, dx: 14, mouth: 1, headDy: 2 }, { wing: 6, cy: 36, dx: 6 }].map(p => () => drawBat(p)),
    hit: [{ wing: -6, cy: 35, eyes: 'closed', flash: 0.55, dx: -3 }, { wing: -2, cy: 34, eyes: 'closed', dx: -2 }].map(p => () => drawBat(p)),
    dead: [{ wing: 10, cy: 40, eyes: 'closed' }, { wing: -10, cy: 52, eyes: 'closed' }, { grounded: true }].map(p => () => drawBat(p))
  }
};
