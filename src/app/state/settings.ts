import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { QualityPreset } from '../../scene/core/quality';
import { movePin, togglePin } from '../../ui/tool-rail/core/tools';
import type { GridSpec } from '../../scene/core/grid';

export type RailSide = 'left' | 'right';
export type QualityMode = 'auto' | QualityPreset;
export type MotionSetting = 'system' | 'reduced' | 'full';
/** What players see of other creatures' HP (Prompt §4.3). */
export type HpVisibility = 'numbers' | 'bar' | 'word' | 'hidden';

type SettingsState = {
  railSide: RailSide;
  qualityMode: QualityMode;
  /** null = the role's default pins (Visual.md §7.1). */
  pinnedTools: string[] | null;
  /** WCAG 2.1.4: single-character shortcuts can be turned off. */
  singleKeyShortcuts: boolean;
  motion: MotionSetting;
  /** Local demo only: preview the player's view of the rail. */
  viewAsPlayer: boolean;
  /** Demo table grid until the map builder exists (Phase 5). */
  grid: GridSpec;
  /** Camera tilt limits in degrees from straight down (Prompt §3: 25°–75°, adjustable). */
  tiltRange: { min: number; max: number };
  hpVisibility: HpVisibility;
};

type SettingsActions = {
  setRailSide: (side: RailSide) => void;
  setQualityMode: (mode: QualityMode) => void;
  togglePin: (id: string, defaults: string[]) => void;
  movePin: (id: string, dir: 1 | -1, defaults: string[]) => void;
  setSingleKeyShortcuts: (on: boolean) => void;
  setMotion: (motion: MotionSetting) => void;
  setViewAsPlayer: (on: boolean) => void;
  setGridType: (type: GridSpec['type']) => void;
  setTiltRange: (range: { min: number; max: number }) => void;
  setHpVisibility: (visibility: HpVisibility) => void;
};

export const useSettings = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      railSide: 'right',
      qualityMode: 'auto',
      pinnedTools: null,
      singleKeyShortcuts: true,
      motion: 'system',
      viewAsPlayer: false,
      grid: { type: 'square', width: 30, depth: 30 },
      tiltRange: { min: 25, max: 75 },
      hpVisibility: 'bar',

      setRailSide: (railSide) => set({ railSide }),
      setQualityMode: (qualityMode) => set({ qualityMode }),
      togglePin: (id, defaults) =>
        set((s) => ({ pinnedTools: togglePin(s.pinnedTools ?? defaults, id) })),
      movePin: (id, dir, defaults) =>
        set((s) => ({ pinnedTools: movePin(s.pinnedTools ?? defaults, id, dir) })),
      setSingleKeyShortcuts: (singleKeyShortcuts) => set({ singleKeyShortcuts }),
      setMotion: (motion) => set({ motion }),
      setViewAsPlayer: (viewAsPlayer) => set({ viewAsPlayer }),
      setGridType: (type) => set((s) => ({ grid: { ...s.grid, type } })),
      setTiltRange: (tiltRange) => set({ tiltRange }),
      setHpVisibility: (hpVisibility) => set({ hpVisibility }),
    }),
    {
      name: 'dioramatable:settings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        railSide: s.railSide,
        qualityMode: s.qualityMode,
        pinnedTools: s.pinnedTools,
        singleKeyShortcuts: s.singleKeyShortcuts,
        motion: s.motion,
        viewAsPlayer: s.viewAsPlayer,
        grid: s.grid,
        tiltRange: s.tiltRange,
        hpVisibility: s.hpVisibility,
      }),
    },
  ),
);
