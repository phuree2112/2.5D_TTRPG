// Procedural pixel art for the demo table (Visual.md §2.2): characters and nature are 2D sprites,
// the world is 3D with pixel textures. All art is drawn here, so there are no licensing questions.
// Light comes from the upper left, as in Visual.md §2.1.

import { fromRows, outline, PixelImage } from './pixel-art';
import type { RGBA } from './pixel-art';

/** Sprite texture layer size and the world scale shared by every sprite. */
export const SPRITE_LAYER = { width: 32, height: 48 };
export const PIXELS_PER_UNIT = 24;

export function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (value: string, alpha = 255): RGBA => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5, 7), 16),
  alpha,
];

// ---------------------------------------------------------------------------------------------
// Characters (16 × 24). Palette swaps give variety from one drawing.

const KNIGHT = [
  '......oooo......',
  '.....ommmmo.....',
  '....ommwmmmo....',
  '....ommmmmmo....',
  '....oMoooMMo....',
  '....oMseseMo....',
  '.....oMMMMo.....',
  '....rroooorr....',
  '...rRommmmoRr...',
  '...rRmmwmmmRr...',
  '..orRmmmmmmRro..',
  '..osRMmmmmMRso..',
  '..osRbbbbbbRso..',
  '...oRmmmmmmRo...',
  '...oRMmmmmMRo...',
  '...oRRMMMMRRo...',
  '....oMMooMMo....',
  '....oMMooMMo....',
  '....omMoomMo....',
  '....oMMooMMo....',
  '....oBBooBBo....',
  '...oBBBooBBBo...',
  '...oooo..oooo...',
];

const CHARACTER_BASE = {
  o: hex('#23202e'),
  m: hex('#a8b4c0'),
  M: hex('#6d7a88'),
  w: hex('#e8eef4'),
  s: hex('#f2c49b'),
  e: hex('#23202e'),
  b: hex('#6b4423'),
  B: hex('#3b2a20'),
};

export function knight(): PixelImage {
  return fromRows(KNIGHT, { ...CHARACTER_BASE, r: hex('#b8333a'), R: hex('#7c1f2c') });
}

export function ranger(): PixelImage {
  return fromRows(KNIGHT, {
    ...CHARACTER_BASE,
    m: hex('#8c6a43'),
    M: hex('#5e4630'),
    w: hex('#c9a26b'),
    r: hex('#3f7a46'),
    R: hex('#2a5232'),
  });
}

// ---------------------------------------------------------------------------------------------
// Nature

type Shades = { light: RGBA; mid: RGBA; dark: RGBA; edge: RGBA };

const GREEN: Shades = {
  light: hex('#7db35a'),
  mid: hex('#4f8a3c'),
  dark: hex('#2f5e2c'),
  edge: hex('#1b3520'),
};
const PINE: Shades = {
  light: hex('#5f9a5a'),
  mid: hex('#3b6e44'),
  dark: hex('#244a33'),
  edge: hex('#132a1f'),
};
const AUTUMN: Shades = {
  light: hex('#f4d35e'),
  mid: hex('#d9a83a'),
  dark: hex('#9c6a24'),
  edge: hex('#4a3214'),
};
const BARK = { mid: hex('#7a5232'), dark: hex('#4e3320') };

/** Pick a shade from a lighting value, dithering at the boundaries. */
function shade(s: Shades, value: number, x: number, y: number): RGBA {
  const dither = (x + y) % 2 === 0 ? 0.08 : -0.08;
  const v = value + dither;
  return v < 0.33 ? s.light : v > 0.66 ? s.dark : s.mid;
}

function trunk(image: PixelImage, cx: number, top: number, bottom: number, width: number) {
  for (let y = top; y <= bottom; y++) {
    for (let x = cx - width / 2; x < cx + width / 2; x++) {
      image.set(x, y, x < cx ? BARK.mid : BARK.dark);
    }
  }
}

export function pineTree(): PixelImage {
  const image = new PixelImage(24, 44);
  const cx = 12;
  trunk(image, cx, 37, 43, 4);
  const tiers = [
    { top: 0, bottom: 12, half: 6 },
    { top: 8, bottom: 22, half: 9 },
    { top: 17, bottom: 31, half: 11 },
    { top: 25, bottom: 38, half: 12 },
  ];
  for (const tier of tiers) {
    for (let y = tier.top; y <= tier.bottom; y++) {
      const half = Math.round(1 + ((tier.half - 1) * (y - tier.top)) / (tier.bottom - tier.top));
      for (let x = cx - half; x < cx + half; x++) {
        const across = (x - (cx - half)) / (2 * half);
        const down = (y - tier.top) / (tier.bottom - tier.top);
        image.set(x, y, shade(PINE, across * 0.8 + down * 0.35, x, y));
      }
    }
  }
  outline(image, PINE.edge);
  return image;
}

function roundTree(colors: Shades, seed: number): PixelImage {
  const image = new PixelImage(28, 38);
  const random = rng(seed);
  trunk(image, 14, 24, 37, 4);
  const blobs = [
    { x: 14, y: 9, r: 9 },
    { x: 7, y: 15, r: 7 },
    { x: 21, y: 15, r: 7 },
    { x: 14, y: 18, r: 8 },
  ];
  for (let y = 0; y < 30; y++) {
    for (let x = 0; x < 28; x++) {
      if (!blobs.some((b) => (x - b.x) ** 2 + (y - b.y) ** 2 <= b.r * b.r)) continue;
      const light = ((x - 14) / 14) * 0.5 + ((y - 12) / 14) * 0.5 + 0.5;
      const leafy = random() < 0.12 ? -0.25 : 0; // scattered highlights read as leaves
      image.set(x, y, shade(colors, light + leafy, x, y));
    }
  }
  outline(image, colors.edge);
  return image;
}

export const oakTree = () => roundTree(GREEN, 7);
export const autumnTree = () => roundTree(AUTUMN, 11);

export function bush(): PixelImage {
  const image = new PixelImage(18, 11);
  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < 18; x++) {
      const inside = ((x - 9) / 9) ** 2 + ((y - 7) / 6.5) ** 2 <= 1 && y > 0;
      if (inside) image.set(x, y, shade(GREEN, (x / 18) * 0.7 + (y / 11) * 0.4, x, y));
    }
  }
  outline(image, GREEN.edge);
  return image;
}

export function campfire(): PixelImage {
  return fromRows(
    [
      '......y.......',
      '.....yy.......',
      '.....yoy..y...',
      '....yoooy.y...',
      '...yoorooyy...',
      '...yorrrooy...',
      '..yoorrrrooy..',
      '..yorrRRrroy..',
      '...orRRRRro...',
      '.gbbbrRRrbbbg.',
      'gGbBBbbbbBBbGg',
      '.gGbbBBBBbbGg.',
      '..ggGGGGGGgg..',
    ],
    {
      y: hex('#ffe9a3'),
      o: hex('#ffb34d'),
      r: hex('#ff7a2e'),
      R: hex('#e0442a'),
      b: hex('#7a5232'),
      B: hex('#4e3320'),
      g: hex('#9a9a8e'),
      G: hex('#6a6a62'),
    },
  );
}

export function torch(): PixelImage {
  const pole = Array.from({ length: 14 }, (_, i) => (i % 5 === 0 ? '..gbbg..' : '...bb...'));
  return fromRows(
    [
      '...y....',
      '..yoy...',
      '..yooy..',
      '.yorroy.',
      '.yorRro.',
      '.yoRRro.',
      '..orro..',
      '..oRRo..',
      '.gGGGGg.',
      '..gBBg..',
      ...pole,
      '..gggg..',
    ],
    {
      y: hex('#ffe9a3'),
      o: hex('#ffb34d'),
      r: hex('#ff7a2e'),
      R: hex('#e0442a'),
      b: hex('#6b4423'),
      B: hex('#3b2a20'),
      g: hex('#5a5a54'),
      G: hex('#3a3a36'),
    },
  );
}

/** Sprite layers in texture-array order. */
export const SPRITES = {
  knight: { layer: 0, draw: knight },
  ranger: { layer: 1, draw: ranger },
  pine: { layer: 2, draw: pineTree, sway: true },
  oak: { layer: 3, draw: oakTree, sway: true },
  autumn: { layer: 4, draw: autumnTree, sway: true },
  bush: { layer: 5, draw: bush, sway: true },
  campfire: { layer: 6, draw: campfire, emissive: true },
  torch: { layer: 7, draw: torch, emissive: true },
} as const;

export type SpriteKind = keyof typeof SPRITES;

// ---------------------------------------------------------------------------------------------
// Tiling textures for the 3D world (24 px per world unit, matching the sprites).

export function grassTexture(): PixelImage {
  const size = 96; // 4 × 4 cells, then repeats
  const image = new PixelImage(size, size);
  const random = rng(3);
  // Close tones: HD-2D ground reads as texture, not noise.
  const tones = [hex('#557a36'), hex('#527634'), hex('#5a7e3a'), hex('#4f7232')];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      image.set(x, y, tones[Math.floor(random() * random() * tones.length)]!);
    }
  }
  // Blades: short light strokes, wrapping so the tile repeats without seams.
  for (let i = 0; i < 140; i++) {
    const x = Math.floor(random() * size);
    const y = Math.floor(random() * size);
    image.set(x, y, hex('#6b9446'));
    image.set(x, (y + 1) % size, hex('#628a40'));
  }
  // A few flowers.
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(random() * size);
    const y = Math.floor(random() * size);
    image.set(x, y, random() < 0.5 ? hex('#f4f1e6') : hex('#f4d35e'));
  }
  return image;
}

export function stoneTexture(): PixelImage {
  const image = new PixelImage(24, 24);
  const random = rng(5);
  const mortar = hex('#5b5a52');
  const tones = [hex('#a8a493'), hex('#9a9684'), hex('#b4b09e')];
  for (let y = 0; y < 24; y++) {
    const row = Math.floor(y / 6);
    const offset = row % 2 === 0 ? 0 : 6;
    for (let x = 0; x < 24; x++) {
      const isMortar = y % 6 === 5 || (x + offset) % 12 === 11;
      image.set(x, y, isMortar ? mortar : tones[Math.floor(random() * tones.length)]!);
    }
  }
  return image;
}

export function woodTexture(): PixelImage {
  const image = new PixelImage(24, 24);
  const random = rng(9);
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const seam = y % 8 === 7 || x === 0 || x === 23;
      const grain = random() < 0.15;
      image.set(x, y, seam ? hex('#4e3320') : grain ? hex('#8f6038') : hex('#a0703f'));
    }
  }
  return image;
}
