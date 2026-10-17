import { describe, expect, it } from 'vitest';
import { SAMPLE_TOKENS, TOKEN_IMAGE_SIZE, tokenImage } from './sample-art';

describe('sample tokens (Prompt §12)', () => {
  it('has the 8 required characters', () => {
    expect(SAMPLE_TOKENS.map((t) => t.id)).toEqual([
      'warrior',
      'mage',
      'rogue',
      'cleric',
      'goblin',
      'wolf',
      'skeleton',
      'bear',
    ]);
  });

  it('renders each to a square token image with a transparent background', () => {
    for (const sample of SAMPLE_TOKENS) {
      const image = tokenImage(sample.draw());
      expect(image.length, sample.id).toBe(TOKEN_IMAGE_SIZE * TOKEN_IMAGE_SIZE * 4);
      expect(image[3], `${sample.id} top-left alpha`).toBe(0);
    }
  });

  it('stands the character 8 % above the bottom, leaving headroom for Pop-out', () => {
    const size = TOKEN_IMAGE_SIZE;
    const image = tokenImage(SAMPLE_TOKENS[0].draw());
    const rowFilled = (y: number) =>
      Array.from({ length: size }, (_, x) => image[(y * size + x) * 4 + 3]! > 0).some(Boolean);
    const filledRows = Array.from({ length: size }, (_, y) => y).filter(rowFilled);
    expect(filledRows.at(-1)).toBe(size - Math.round(size * 0.08) - 1);
    expect(filledRows[0]).toBeGreaterThan(size * 0.05);
  });
});
