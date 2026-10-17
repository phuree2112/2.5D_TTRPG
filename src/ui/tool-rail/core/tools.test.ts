import { describe, expect, it } from 'vitest';
import { movePin, searchTools, togglePin, toolsForRole } from './tools';
import type { ToolInfo } from './tools';

const tools: ToolInfo[] = [
  { id: 'select', group: 'play', label: 'Select', keywords: ['pointer'], roles: 'all' },
  { id: 'measure', group: 'play', label: 'Measure', keywords: ['ruler', 'distance'], roles: 'all' },
  { id: 'terrain', group: 'build', label: 'Terrain', keywords: ['paint', 'ground'], roles: 'gm' },
  { id: 'settings', group: 'room', label: 'Settings', keywords: ['options'], roles: 'all' },
];

describe('toolsForRole', () => {
  it('gives the GM every tool', () => {
    expect(toolsForRole(tools, 'gm').map((t) => t.id)).toEqual([
      'select',
      'measure',
      'terrain',
      'settings',
    ]);
  });

  it('hides GM-only tools from players', () => {
    expect(toolsForRole(tools, 'player').map((t) => t.id)).not.toContain('terrain');
  });
});

describe('searchTools', () => {
  it('matches labels case-insensitively, prefix matches first', () => {
    const extra: ToolInfo = { id: 'mset', group: 'room', label: 'Map set', roles: 'all' };
    expect(searchTools([...tools, extra], 'se').map((t) => t.id)).toEqual([
      'select',
      'settings',
      'mset',
    ]);
    expect(searchTools([...tools, extra], 'SET').map((t) => t.id)).toEqual(['settings', 'mset']);
  });

  it('matches keywords', () => {
    expect(searchTools(tools, 'ruler').map((t) => t.id)).toEqual(['measure']);
  });

  it('returns every tool for an empty query', () => {
    expect(searchTools(tools, '  ')).toHaveLength(tools.length);
  });
});

describe('pinned tools', () => {
  it('adds and removes a pin', () => {
    expect(togglePin(['select'], 'measure')).toEqual(['select', 'measure']);
    expect(togglePin(['select', 'measure'], 'select')).toEqual(['measure']);
  });

  it('moves a pin up or down and stops at the ends', () => {
    expect(movePin(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b']);
    expect(movePin(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
    expect(movePin(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
  });
});
