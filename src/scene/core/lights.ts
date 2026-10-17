// Point-light presets (Visual.md §4.1). Pure data.

export type LightPreset = 'torch' | 'campfire' | 'lantern' | 'magic';

export const LIGHT_PRESETS: Record<
  LightPreset,
  { color: string; radius: number; intensity: number; flicker: { amount: number; hz: number } }
> = {
  torch: { color: '#ff9a3c', radius: 6, intensity: 1.0, flicker: { amount: 0.12, hz: 7 } },
  campfire: { color: '#ff7a2e', radius: 8, intensity: 1.4, flicker: { amount: 0.15, hz: 5 } },
  lantern: { color: '#ffc56e', radius: 5, intensity: 0.8, flicker: { amount: 0.04, hz: 3 } },
  magic: { color: '#8f7cff', radius: 6, intensity: 1.0, flicker: { amount: 0.08, hz: 0.6 } },
};

/** A light in the scene. `levelId` is used by multi-level occlusion (Phase 6). */
export type SceneLight = {
  id: string;
  preset: LightPreset;
  x: number;
  y: number;
  z: number;
  levelId?: string;
};
