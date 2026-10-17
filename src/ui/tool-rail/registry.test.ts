import { describe, expect, it } from 'vitest';
import { DEFAULT_PINS, GROUPS, TOOLS } from './registry';

describe('tool registry', () => {
  it('gives every tool a unique shortcut', () => {
    const keys = TOOLS.map((t) => `${t.shortcut.shift ? 'shift+' : ''}${t.shortcut.key}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps Q, E and ? free for the camera and the help sheet', () => {
    const reserved = TOOLS.filter(
      (t) => (!t.shortcut.shift && ['q', 'e'].includes(t.shortcut.key)) || t.shortcut.key === '?',
    );
    expect(reserved).toEqual([]);
  });

  it('puts every tool in a known group', () => {
    const groups = new Set(GROUPS.map((g) => g.id));
    expect(TOOLS.filter((t) => !groups.has(t.group))).toEqual([]);
  });

  it('only pins tools the role can use', () => {
    const playerTools = new Set(TOOLS.filter((t) => t.roles === 'all').map((t) => t.id));
    expect(DEFAULT_PINS.player.filter((id) => !playerTools.has(id))).toEqual([]);
  });

  it('lists the tool groups of Prompt §14.1, with Build for the GM only', () => {
    expect(GROUPS.map((g) => g.id)).toEqual([
      'play',
      'tokens',
      'dice',
      'combat',
      'build',
      'levels',
      'scene',
      'room',
    ]);
    expect(GROUPS.find((g) => g.id === 'build')?.roles).toBe('gm');
  });
});
