import { create } from 'zustand';
import { initialPreset } from '../../scene/core/quality';
import type { QualityPreset } from '../../scene/core/quality';
import { useSettings } from './settings';

export type CameraMode = 'orbit' | 'topdown';

/** What covers part of the scene. Only one at a time (Prompt §14.2). */
export type OpenPanel =
  | { kind: 'tool'; toolId: string }
  | { kind: 'all-tools' }
  | { kind: 'palette' }
  | { kind: 'help' }
  | null;

type SessionState = {
  activeToolId: string;
  openPanel: OpenPanel;
  expandedGroup: string | null;
  railCollapsed: boolean;
  /** The preset actually in use (from Settings or the auto governor). */
  preset: QualityPreset;
  cameraMode: CameraMode;
};

type SessionActions = {
  selectTool: (toolId: string) => void;
  openTool: (toolId: string) => void;
  setOpenPanel: (panel: OpenPanel) => void;
  closePanel: () => void;
  toggleGroup: (group: string) => void;
  setRailCollapsed: (collapsed: boolean) => void;
  setPreset: (preset: QualityPreset) => void;
  setCameraMode: (mode: CameraMode) => void;
};

const coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

// Settings hydrate synchronously from localStorage, so a saved override applies on first paint.
function startingPreset(): QualityPreset {
  const mode = useSettings.getState().qualityMode;
  return mode === 'auto' ? initialPreset({ coarsePointer }) : mode;
}

export const useSession = create<SessionState & SessionActions>()((set) => ({
  activeToolId: 'select',
  openPanel: null,
  expandedGroup: null,
  railCollapsed: false,
  preset: startingPreset(),
  cameraMode: 'orbit',

  selectTool: (activeToolId) => set({ activeToolId }),
  openTool: (toolId) =>
    set((s) => {
      const alreadyOpen = s.openPanel?.kind === 'tool' && s.openPanel.toolId === toolId;
      return {
        activeToolId: toolId,
        openPanel: alreadyOpen ? null : { kind: 'tool', toolId },
      };
    }),
  setOpenPanel: (openPanel) => set({ openPanel }),
  closePanel: () => set({ openPanel: null }),
  toggleGroup: (group) => set((s) => ({ expandedGroup: s.expandedGroup === group ? null : group })),
  setRailCollapsed: (railCollapsed) => set({ railCollapsed }),
  setPreset: (preset) => set({ preset }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
}));
