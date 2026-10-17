import { describe, expect, it } from 'vitest';
import { hpView, labelName } from './labels';

describe('hpView (Prompt §4.3: HP visibility is a room setting)', () => {
  it('always shows the GM full numbers', () => {
    expect(hpView({ faction: 'enemy', viewer: 'gm', setting: 'hidden' })).toBe('numbers');
  });

  it('shows players their own party in full', () => {
    expect(hpView({ faction: 'player', viewer: 'player', setting: 'word' })).toBe('numbers');
  });

  it('applies the room setting to everyone else', () => {
    expect(hpView({ faction: 'enemy', viewer: 'player', setting: 'bar' })).toBe('bar');
    expect(hpView({ faction: 'neutral', viewer: 'player', setting: 'word' })).toBe('word');
    expect(hpView({ faction: 'enemy', viewer: 'player', setting: 'hidden' })).toBe('none');
  });
});

describe('labelName (Visual.md §3.5)', () => {
  it('keeps names up to 16 characters', () => {
    expect(labelName('Mira the Bold')).toBe('Mira the Bold');
  });

  it('truncates longer names with an ellipsis', () => {
    expect(labelName('Bartholomew the Unbreakable')).toBe('Bartholomew the…');
  });

  it('counts Thai grapheme clusters, not code units', () => {
    // "ผู้กล้า" is 7 code points but 4 user-perceived characters.
    expect(labelName('ผู้กล้า')).toBe('ผู้กล้า');
  });
});
