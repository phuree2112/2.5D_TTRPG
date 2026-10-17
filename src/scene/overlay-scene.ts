import { Scene } from 'three';

// Table UI drawn in WebGL (name labels, HP bars) keeps its exact colours and stays sharp
// (Visual.md §3.5), so it lives in its own scene, drawn after post-processing by FinalRender
// (overlay.tsx): no tilt-shift blur, tone mapping, grade or fog, and always on top.

/** Portal target for table UI: `createPortal(<mesh />, overlayScene)`. */
export const overlayScene = new Scene();

let composerActive = false;

/** PostFX reports while its composer is mounted, so the scene is not drawn twice. */
export function setComposerActive(active: boolean): void {
  composerActive = active;
}

export function isComposerActive(): boolean {
  return composerActive;
}
