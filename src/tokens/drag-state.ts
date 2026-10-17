import { create } from 'zustand';
import type { Cell } from '../scene/core/grid';

/** The token being dragged right now (transient; read per frame, never rendered by React). */
export type TokenDrag = {
  tokenId: string;
  x: number;
  z: number;
  cell: Cell;
  distance: string;
  screen: { x: number; y: number };
};

export const useTokenDrag = create<{ drag: TokenDrag | null }>()(() => ({ drag: null }));
