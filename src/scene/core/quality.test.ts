import { describe, expect, it } from 'vitest';
import { createGovernor, governorStep, initialPreset, QUALITY_PRESETS } from './quality';
import type { GovernorState } from './quality';

function feed(state: GovernorState, frameMs: number, frames: number) {
  const changes: string[] = [];
  let s = state;
  for (let i = 0; i < frames; i++) {
    const result = governorStep(s, frameMs);
    s = result.state;
    if (result.change) changes.push(result.change);
  }
  return { state: s, changes };
}

describe('quality presets', () => {
  it('follow the light budget in Prompt §5 and Engineering.md §7.7', () => {
    expect(QUALITY_PRESETS.low.poolLights).toBe(2);
    expect(QUALITY_PRESETS.medium.poolLights).toBe(4);
    expect(QUALITY_PRESETS.high.poolLights).toBe(8);
    expect(QUALITY_PRESETS.low.dprCap).toBe(1);
    expect(QUALITY_PRESETS.medium.dprCap).toBe(1.5);
    expect(QUALITY_PRESETS.low.shadowMapSize).toBe(0);
  });

  it('starts touch devices on Medium and mouse devices on High', () => {
    expect(initialPreset({ coarsePointer: true })).toBe('medium');
    expect(initialPreset({ coarsePointer: false })).toBe('high');
  });
});

describe('quality governor (demand-rendering aware)', () => {
  it('steps down after sustained frame rates under 48 FPS', () => {
    const { changes } = feed(createGovernor('medium'), 1000 / 30, 200);
    expect(changes[0]).toBe('down');
  });

  it('steps up after sustained frame rates at the display limit', () => {
    const { changes } = feed(createGovernor('medium'), 1000 / 60, 200);
    expect(changes[0]).toBe('up');
  });

  it('ignores gaps between demand-rendered frames', () => {
    // An idle scene draws one frame every 2 s; that is not a 0.5 FPS device.
    const { changes } = feed(createGovernor('medium'), 2000, 200);
    expect(changes).toEqual([]);
  });

  it('never steps below Low or above High', () => {
    expect(feed(createGovernor('low'), 1000 / 20, 400).changes).toEqual([]);
    expect(feed(createGovernor('high'), 1000 / 60, 400).changes).toEqual([]);
  });

  it('locks the preset after flip-flopping up, down, up', () => {
    // 120 frames = 4 windows of 30 frames: exactly one decision per round.
    let s = createGovernor('medium');
    const all: string[] = [];
    for (let round = 0; round < 6; round++) {
      const frameMs = round % 2 === 0 ? 1000 / 60 : 1000 / 30;
      const result = feed(s, frameMs, 120);
      s = result.state;
      all.push(...result.changes);
    }
    expect(all).toEqual(['up', 'down', 'up']);
    expect(s.locked).toBe(true);
  });
});
