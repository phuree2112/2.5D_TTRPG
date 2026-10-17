import { create } from 'zustand';
import type { Cell } from '../../scene/core/grid';
import type { Hp, SizeCategory } from '../../tokens/core/rules';
import { SAMPLE_TOKENS } from '../../tokens/core/sample-art';
import type { SampleTokenId } from '../../tokens/core/sample-art';

// Tokens on the table (Prompt §4). Kept in memory until the data layer arrives (Phase 9).

export type DisplayMode = 'flat' | 'standee' | 'popout';
export type Faction = 'player' | 'enemy' | 'ally' | 'neutral';

export type Token = {
  id: string;
  name: string;
  imageId: string;
  displayMode: DisplayMode;
  size: SizeCategory;
  faction: Faction;
  /** Top-left cell of the footprint. */
  cell: Cell;
  hp: Hp;
  hidden: boolean;
};

export type NewToken = Omit<Token, 'id'>;

type TokensState = {
  tokens: Record<string, Token>;
  order: string[];
  selectedId: string | null;
};

type TokensActions = {
  addToken: (token: NewToken) => string;
  updateToken: (id: string, patch: Partial<NewToken>) => void;
  moveToken: (id: string, cell: Cell) => void;
  removeToken: (id: string) => void;
  select: (id: string | null) => void;
};

export const sampleImageId = (id: SampleTokenId) => `sample:${id}`;

function sample(
  id: SampleTokenId,
  col: number,
  row: number,
  extra: Partial<NewToken> = {},
): NewToken {
  const s = SAMPLE_TOKENS.find((t) => t.id === id)!;
  return {
    name: s.name,
    imageId: sampleImageId(id),
    displayMode: 'standee',
    size: s.size,
    faction: s.faction,
    cell: { col, row },
    hp: { current: 20, max: 20, temp: 0 },
    hidden: false,
    ...extra,
  };
}

/** The 20-token benchmark scene of Prompt §13: a party round the campfire and their foes. */
function demoTokens(): NewToken[] {
  return [
    sample('warrior', 13, 17, { displayMode: 'popout', hp: { current: 26, max: 30, temp: 5 } }),
    sample('mage', 15, 18, { hp: { current: 9, max: 18, temp: 0 } }),
    sample('rogue', 17, 17, {
      displayMode: 'popout',
      name: 'Rogue',
      hp: { current: 21, max: 24, temp: 0 },
    }),
    sample('cleric', 16, 19, { hp: { current: 5, max: 22, temp: 0 } }),
    ...[10, 12, 14, 16, 18, 20].map((col, i) =>
      sample('goblin', col, 8 + (i % 2), {
        name: `Goblin ${i + 1}`,
        hp: { current: 7, max: 7, temp: 0 },
      }),
    ),
    sample('goblin', 11, 11, {
      name: 'Goblin 7',
      displayMode: 'flat',
      hp: { current: 3, max: 7, temp: 0 },
    }),
    sample('goblin', 19, 11, {
      name: 'Goblin 8',
      displayMode: 'flat',
      hp: { current: 0, max: 7, temp: 0 },
    }),
    ...[
      [22, 12],
      [23, 14],
      [22, 16],
      [24, 13],
    ].map(([col, row], i) => sample('wolf', col!, row!, { name: `Wolf ${i + 1}` })),
    ...[
      [6, 12],
      [7, 14],
      [6, 16],
    ].map(([col, row], i) => sample('skeleton', col!, row!, { name: `Skeleton ${i + 1}` })),
    sample('bear', 20, 21, { name: 'Old Bear', hp: { current: 34, max: 34, temp: 0 } }),
  ];
}

const newId = () => crypto.randomUUID();

function seed(): Pick<TokensState, 'tokens' | 'order'> {
  const tokens: Record<string, Token> = {};
  const order: string[] = [];
  for (const t of demoTokens()) {
    const id = newId();
    tokens[id] = { ...t, id };
    order.push(id);
  }
  return { tokens, order };
}

export const useTokens = create<TokensState & TokensActions>()((set) => ({
  ...seed(),
  selectedId: null,

  addToken: (token) => {
    const id = newId();
    set((s) => ({
      tokens: { ...s.tokens, [id]: { ...token, id } },
      order: [...s.order, id],
      selectedId: id,
    }));
    return id;
  },
  updateToken: (id, patch) =>
    set((s) => {
      const token = s.tokens[id];
      return token ? { tokens: { ...s.tokens, [id]: { ...token, ...patch } } } : {};
    }),
  moveToken: (id, cell) =>
    set((s) => {
      const token = s.tokens[id];
      return token ? { tokens: { ...s.tokens, [id]: { ...token, cell } } } : {};
    }),
  removeToken: (id) =>
    set((s) => {
      const rest = { ...s.tokens };
      delete rest[id];
      return {
        tokens: rest,
        order: s.order.filter((o) => o !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
      };
    }),
  select: (selectedId) => set({ selectedId }),
}));
