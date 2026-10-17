// The 8 sample tokens of Prompt §12, drawn as pixel art in code (no licensing questions).
// Each becomes a 256 × 256 token image: transparent background, character bottom-centred with
// headroom, so Pop-out mode can let the head break out of the frame (Visual.md §3.2).

import { fromRows } from '../../scene/core/pixel-art';
import type { RGBA, PixelImage } from '../../scene/core/pixel-art';
import { knight, ranger } from '../../scene/core/sprite-art';

const hex = (value: string): RGBA => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5, 7), 16),
  255,
];

const ROBE = [
  '......oo........',
  '.....oppo.......',
  '.....oppPo......',
  '....opppPo......',
  '....oppppPo...g.',
  '..ooyyyyyyyoo.t.',
  '...osseessso..t.',
  '...ossssssso..t.',
  '...owwsswwwo..t.',
  '..opwwwwwwwpo.t.',
  '.opppwwwwwpppost',
  '.oppppwwwppppot.',
  '.opppppppppppot.',
  '.oPppppyyppppPt.',
  '.oPPppppppppPPt.',
  '..oPPpppppppPPo.',
  '..oPPPpppppPPPo.',
  '..oPPPPpppPPPPo.',
  '...oPPPPPPPPPo..',
  '...oPPPPPPPPPo..',
  '...ooBBoooBBoo..',
  '...oBBBo.oBBBo..',
  '....ooo...ooo...',
];

const GOBLIN = [
  'o....oooo....o',
  'go..oggggo..og',
  '.googgggggoog.',
  '..ogeggggego..',
  '..oggggggggo..',
  '...ogwwwwgo...',
  '....oggggo....',
  '...obbbbbbo..d',
  '..obbbbbbbbo.d',
  '..ogbbbbbbgood',
  '..ogbBBBBbgo..',
  '...obbbbbbo...',
  '...obbobbbo...',
  '...oggoggo....',
  '...ooooooo....',
];

const SKELETON = [
  '....oooooo....',
  '...owwwwwwo...',
  '..owwwwwwwwo..',
  '..owkkwwkkwo..',
  '..owkkwwkkwo..',
  '...owwkkwwo...',
  '....owwwwo....',
  '....okwkwo....',
  '...oowwwwoo...',
  '..owokwwkowo..',
  '..owowwwwowo..',
  '..owokwwkowo..',
  '...ooowwooo...',
  '.....owwo.....',
  '....owkkwo....',
  '....ow..wo....',
  '....ow..wo....',
  '....ow..wo....',
  '...oww..wwo...',
  '...ooo..ooo...',
];

const WOLF = [
  'oo',
  'owo',
  'owwo',
  'owgwooooo',
  'ogggggggggoo',
  'ekgggggggggggooooooooo',
  'okggggggggggggggggggggo',
  '.oggggggggggggggggggggo',
  '..ooggGGGGggggggggggggo',
  '....oGGGGGGgggggggggGgoo',
  '....oGGo.oGGgggggGGo.oGo',
  '....oGo...oGo..oGGo...oo',
  '....oGo...oGo..oGo',
  '...oGGo..oGGo.oGGo',
  '...ooo...ooo..ooo',
];

const BEAR = [
  '.....oo....oo',
  '....obbo..obbo',
  '....obbboobbbo',
  '...obbbbbbbbbbo',
  '..obbebbbbbebbo',
  '..obbbbbbbbbbbo',
  '...obbbkkkbbbo',
  '....obbBBBbbo',
  '...oobbbbbbboo',
  '..obbbbbbbbbbbo',
  '.obbbbbbbbbbbbbo',
  'obbbbBBBBBBbbbbbo',
  'obbbBBBBBBBBbbbbo',
  'obbbBBBBBBBBbbbbo',
  '.obbbBBBBBBbbbbo',
  '.obbbbbbbbbbbbbo',
  '.obbbo....obbbo',
  '.obbbo....obbbo',
  '..ooo......ooo',
];

const OUTLINE = hex('#23202e');
const SKIN = hex('#f2c49b');
const BOOTS = hex('#3b2a20');

export function mage(): PixelImage {
  return fromRows(ROBE, {
    o: OUTLINE,
    p: hex('#5b4a9e'),
    P: hex('#3d3170'),
    y: hex('#f4b23e'),
    s: SKIN,
    e: OUTLINE,
    w: hex('#e8e4dc'),
    t: hex('#8a5a36'),
    g: hex('#7fd6ff'),
    B: BOOTS,
  });
}

export function cleric(): PixelImage {
  return fromRows(ROBE, {
    o: OUTLINE,
    p: hex('#ece6d6'),
    P: hex('#bfae86'),
    y: hex('#d9a83a'),
    s: SKIN,
    e: OUTLINE,
    w: hex('#a5793f'),
    t: hex('#d9a83a'),
    g: hex('#fff4c2'),
    B: BOOTS,
  });
}

export const goblin = () =>
  fromRows(GOBLIN, {
    o: hex('#1f2a14'),
    g: hex('#6a9a3a'),
    e: hex('#f4d35e'),
    w: hex('#e8e4dc'),
    b: hex('#6b4423'),
    B: hex('#3b2a20'),
    d: hex('#c0c8d0'),
  });

export const skeleton = () =>
  fromRows(SKELETON, { o: hex('#3a3640'), w: hex('#e8e4d0'), k: hex('#2a2630') });

export const wolf = () =>
  fromRows(WOLF, {
    o: hex('#2a2a33'),
    g: hex('#8a8f99'),
    G: hex('#5c616b'),
    w: hex('#c7ccd4'),
    k: hex('#23202e'),
    e: hex('#f4d35e'),
  });

export const bear = () =>
  fromRows(BEAR, {
    o: hex('#2a1a12'),
    b: hex('#7a5232'),
    B: hex('#a07850'),
    e: hex('#23202e'),
    k: hex('#23202e'),
  });

export const SAMPLE_TOKENS = [
  { id: 'warrior', name: 'Warrior', draw: knight, faction: 'player', size: 'medium' },
  { id: 'mage', name: 'Mage', draw: mage, faction: 'player', size: 'medium' },
  { id: 'rogue', name: 'Rogue', draw: ranger, faction: 'player', size: 'medium' },
  { id: 'cleric', name: 'Cleric', draw: cleric, faction: 'player', size: 'medium' },
  { id: 'goblin', name: 'Goblin', draw: goblin, faction: 'enemy', size: 'small' },
  { id: 'wolf', name: 'Wolf', draw: wolf, faction: 'enemy', size: 'medium' },
  { id: 'skeleton', name: 'Skeleton', draw: skeleton, faction: 'enemy', size: 'medium' },
  { id: 'bear', name: 'Bear', draw: bear, faction: 'neutral', size: 'large' },
] as const;

export type SampleTokenId = (typeof SAMPLE_TOKENS)[number]['id'];

export const TOKEN_IMAGE_SIZE = 256;

/**
 * Upscale pixel art (nearest neighbour) into a square RGBA token image, top-left origin.
 * The character fills about 84 % of the height and stands 8 % above the bottom edge.
 */
export function tokenImage(art: PixelImage, size = TOKEN_IMAGE_SIZE): Uint8Array {
  const out = new Uint8Array(size * size * 4);
  const scale = Math.max(
    1,
    Math.floor(Math.min((size * 0.84) / art.height, (size * 0.84) / art.width)),
  );
  const w = art.width * scale;
  const h = art.height * scale;
  const left = Math.floor((size - w) / 2);
  const top = size - Math.round(size * 0.08) - h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = (Math.floor(y / scale) * art.width + Math.floor(x / scale)) * 4;
      out.set(art.data.subarray(src, src + 4), ((top + y) * size + left + x) * 4);
    }
  }
  return out;
}
