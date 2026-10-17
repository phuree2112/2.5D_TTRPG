import { describe, expect, it } from 'vitest';
import { flicker, gradeColor, MOODS, moodAt, selectLights } from './atmosphere';

describe('moods (Visual.md §4.1)', () => {
  it('defines the five LUT presets of Prompt §5', () => {
    expect(Object.keys(MOODS)).toEqual(['warmDay', 'dusk', 'night', 'dungeon', 'cold']);
  });

  it('turns the key light off in the dungeon', () => {
    expect(MOODS.dungeon.key.intensity).toBe(0);
  });
});

describe('moodAt (day/night slider)', () => {
  it('is Warm Day at noon and Night at midnight', () => {
    expect(moodAt(12).key.intensity).toBeCloseTo(MOODS.warmDay.key.intensity);
    expect(moodAt(0).key.intensity).toBeCloseTo(MOODS.night.key.intensity);
  });

  it('blends Warm Day into Dusk through the evening', () => {
    const halfway = moodAt(18.5);
    const expected = (MOODS.warmDay.key.intensity + MOODS.dusk.key.intensity) / 2;
    expect(halfway.key.intensity).toBeCloseTo(expected, 1);
  });

  it('wraps around midnight', () => {
    expect(moodAt(24).fog.density).toBeCloseTo(moodAt(0).fog.density);
  });
});

describe('gradeColor (LUT generation)', () => {
  const neutral = {
    temperature: 0,
    saturation: 1,
    contrast: 1,
    shadows: [0, 0, 0] as [number, number, number],
  };

  it('leaves colours untouched with a neutral grade', () => {
    const out = gradeColor([0.2, 0.5, 0.8], neutral);
    [0.2, 0.5, 0.8].forEach((v, i) => expect(out[i]).toBeCloseTo(v, 5));
  });

  it('warms the image with a positive temperature', () => {
    const [r, , b] = gradeColor([0.5, 0.5, 0.5], { ...neutral, temperature: 15 });
    expect(r).toBeGreaterThan(0.5);
    expect(b).toBeLessThan(0.5);
  });

  it('keeps black black when warming or cooling (white balance is a gain)', () => {
    for (const temperature of [-12, 15]) {
      const out = gradeColor([0, 0, 0], { ...neutral, temperature });
      for (const v of out) expect(v).toBeCloseTo(0, 5);
    }
  });

  it('adds contrast without crushing dark detail to black', () => {
    const grade = { ...neutral, contrast: 1.2 };
    const [dark] = gradeColor([0.05, 0.05, 0.05], grade);
    const [darker] = gradeColor([0.02, 0.02, 0.02], grade);
    expect(dark).toBeLessThan(0.05);
    expect(dark).toBeGreaterThan(0.02);
    expect(darker).toBeGreaterThan(0);
    expect(darker).toBeLessThan(dark);
    const [light] = gradeColor([0.9, 0.9, 0.9], grade);
    expect(light).toBeGreaterThan(0.9);
    expect(light).toBeLessThan(1);
  });

  it('removes colour at zero saturation', () => {
    const [r, g, b] = gradeColor([0.8, 0.2, 0.2], { ...neutral, saturation: 0 });
    expect(r).toBeCloseTo(g);
    expect(g).toBeCloseTo(b);
  });

  it('tints the shadows more than the highlights', () => {
    const tint: [number, number, number] = [0, 0, 0.2];
    const dark = gradeColor([0.05, 0.05, 0.05], { ...neutral, shadows: tint });
    const light = gradeColor([0.95, 0.95, 0.95], { ...neutral, shadows: tint });
    expect(dark[2] - 0.05).toBeGreaterThan(light[2] - 0.95);
  });

  it('keeps every channel between 0 and 1', () => {
    const out = gradeColor([1, 1, 0], {
      temperature: 30,
      saturation: 2,
      contrast: 2,
      shadows: [0.3, 0, 0],
    });
    for (const v of out) expect(v >= 0 && v <= 1).toBe(true);
  });
});

describe('selectLights (light budget, Prompt §5)', () => {
  const lights = [
    { id: 'far', x: 20, z: 20 },
    { id: 'near', x: 1, z: 0 },
    { id: 'mid', x: 5, z: 0 },
  ];

  it('makes the N lights nearest the camera focus real', () => {
    expect(selectLights(lights, { x: 0, z: 0 }, 2)).toEqual(['near', 'mid']);
  });

  it('returns every light when the budget allows', () => {
    expect(selectLights(lights, { x: 0, z: 0 }, 8)).toHaveLength(3);
  });
});

describe('flicker', () => {
  it('stays within ±amount around 1', () => {
    for (let t = 0; t < 10; t += 0.13) {
      const f = flicker(t, 3, 0.15, 7);
      expect(f).toBeGreaterThanOrEqual(0.85);
      expect(f).toBeLessThanOrEqual(1.15);
    }
  });

  it('is 1 with no flicker', () => {
    expect(flicker(2.5, 1, 0, 7)).toBe(1);
  });

  it('differs between lights (seeded)', () => {
    expect(flicker(1, 1, 0.15, 7)).not.toBeCloseTo(flicker(1, 2, 0.15, 7), 4);
  });
});
