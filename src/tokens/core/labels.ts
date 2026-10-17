// Token label rules (Prompt §4.3, Visual.md §3.5). Pure.

export type HpView = 'numbers' | 'bar' | 'word' | 'none';
export type HpSetting = 'numbers' | 'bar' | 'word' | 'hidden';

/** What a viewer sees of a token's HP. The GM sees everything; players see their party fully. */
export function hpView(input: {
  faction: string;
  viewer: 'gm' | 'player';
  setting: HpSetting;
}): HpView {
  if (input.viewer === 'gm' || input.faction === 'player') return 'numbers';
  return input.setting === 'hidden' ? 'none' : input.setting;
}

const MAX_NAME = 16;
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** Names longer than 16 user-perceived characters end in "…" (Thai marks count with their base). */
export function labelName(name: string): string {
  const graphemes = Array.from(segmenter.segment(name), (s) => s.segment);
  if (graphemes.length <= MAX_NAME) return name;
  return `${graphemes
    .slice(0, MAX_NAME - 1)
    .join('')
    .trimEnd()}…`;
}
