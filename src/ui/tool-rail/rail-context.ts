import { createContext, use } from 'react';
import type { RailSide } from '../../app/state/settings';
import type { LayoutMode } from '../layout/useLayoutMode';
import type { Role } from './core/tools';
import type { GroupId, ToolDef } from './registry';

// Generic state / actions / meta interface (vercel-composition-patterns): the rail parts
// depend on this contract, not on the zustand stores that implement it.

export interface RailState {
  side: RailSide;
  role: Role;
  layout: LayoutMode;
  tools: ToolDef[];
  groups: { id: GroupId; label: string }[];
  pinned: ToolDef[];
  activeToolId: string;
  openToolId: string | null;
  expandedGroup: string | null;
  collapsed: boolean;
}

export interface RailActions {
  openTool: (id: string) => void;
  toggleGroup: (id: string) => void;
  togglePin: (id: string) => void;
  movePin: (id: string, dir: 1 | -1) => void;
  openAllTools: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export interface RailContextValue {
  state: RailState;
  actions: RailActions;
}

export const RailContext = createContext<RailContextValue | null>(null);

export function useRail(): RailContextValue {
  const value = use(RailContext);
  if (!value) throw new Error('Tool Rail parts must be inside <ToolRailProvider>');
  return value;
}
