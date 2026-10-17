import { useFrame } from '@react-three/fiber';
import { isComposerActive, overlayScene } from './overlay-scene';

/**
 * Owns the end of every frame. A positive priority turns off R3F's own render, so this draws
 * the scene itself when no composer is mounted (Low, or while the PostFX chunk loads). The
 * composer runs at priority 1 and has drawn it already otherwise. Then the table UI goes on
 * top (overlay-scene.ts).
 */
export function FinalRender() {
  useFrame(({ gl, scene, camera }) => {
    if (!isComposerActive()) gl.render(scene, camera);
    const autoClear = gl.autoClear;
    gl.autoClear = false;
    gl.render(overlayScene, camera);
    gl.autoClear = autoClear;
  }, 2);
  return null;
}
