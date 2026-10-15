import { contactSheet, savePng } from './lib.mjs';
import { drawWolf, drawSpider, drawOrc, drawGolem, drawBat, pose } from './monsters.mjs';
const out = process.argv[2];
const cells = [
  { img: drawWolf({ dx: 0, dy: 0 }) }, { img: drawWolf({ dx: 6, lean: 4, jaw: 3, legs: [2, -2, 2, -2] }) }, { img: drawWolf({ lean: -3, eyes: 'closed', flash: 0.5 }) }, { img: drawWolf({ lying: true, dx: -2 }) },
  { img: drawSpider({}) }, { img: drawSpider({ lunge: 5, fang: 3, up: 6, dx: 3 }) }, { img: drawSpider({ eyes: 'closed', flash: 0.5, bob: 2 }) }, { img: drawSpider({ dead: true, bob: 2 }) },
  { img: drawOrc(pose({ weapon: { ang: -70, len: 24 }, handF: [3, 4] })) }, { img: drawOrc(pose({ weapon: { ang: 10, len: 22 }, handF: [6, 6], lean: 4, dx: 2, mouth: 1 })) }, { img: drawOrc(pose({ eyes: 'closed', lean: -3, flash: 0.5, weapon: { ang: 60, len: 22 } })) }, { img: drawOrc(pose({ sink: 8, lean: -5, headDy: 4, eyes: 'x', weapon: { ang: 85, len: 18 } })) },
  { img: drawGolem(pose({ handF: [0, 14], handB: [0, 14] })) }, { img: drawGolem(pose({ handF: [6, -22], handB: [-6, -22], lean: -1 })) }, { img: drawGolem(pose({ eyes: 'closed', lean: -3, flash: 0.5, handF: [0, 14] })) }, { img: drawGolem({ ...pose({}), rubble: 4, glowBits: 2 }) },
  { img: drawBat({ wing: 12 }) }, { img: drawBat({ wing: -12, dx: 6, dy: 6, mouth: 1 }) }, { img: drawBat({ wing: -4, eyes: 'closed', flash: 0.5 }) }, { img: drawBat({ grounded: true }) }
];
savePng(out, contactSheet(cells, 4, 5));
console.log('ok');
