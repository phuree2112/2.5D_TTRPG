import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useThree } from '@react-three/fiber';
import type { CameraControlsImpl } from '@react-three/drei';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { classifyTwoFinger, twoFingerDelta } from '../core/gestures';
import type { FingerPair, Point, TwoFingerMode } from '../core/gestures';
import type { CameraMode } from '../../app/state/session';

// Touch camera gestures (Prompt §3): one finger pans by "holding" the ground under it,
// two-finger twist rotates, pinch zooms, two-finger vertical drag tilts. camera-controls'
// own touch handling is switched off in CameraRig.

const GROUND = new Plane(new Vector3(0, 1, 0), 0);

export function useTouchGestures(
  controlsRef: RefObject<CameraControlsImpl | null>,
  mode: CameraMode,
) {
  const element = useThree((s) => s.gl.domElement);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const pointers = new Map<number, Point>();
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    const hitA = new Vector3();
    const hitB = new Vector3();
    const target = new Vector3();
    let pair: { start: FingerPair; prev: FingerPair; mode: TwoFingerMode } | null = null;
    let panFrom: Point | null = null;

    const groundAt = (p: Point, out: Vector3): Vector3 | null => {
      const controls = controlsRef.current;
      if (!controls) return null;
      const rect = element.getBoundingClientRect();
      ndc.set(((p.x - rect.left) / rect.width) * 2 - 1, -((p.y - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, controls.camera);
      return raycaster.ray.intersectPlane(GROUND, out);
    };

    const fingers = (): FingerPair | null => {
      const [a, b] = [...pointers.values()];
      return a && b ? [a, b] : null;
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      try {
        element.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic pointers (tests, some assistive tech) cannot be captured; gestures still work.
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const two = fingers();
      if (pointers.size === 1) {
        panFrom = { x: e.clientX, y: e.clientY };
      } else if (two && pointers.size === 2) {
        panFrom = null;
        pair = { start: two, prev: two, mode: 'pending' };
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || !pointers.has(e.pointerId)) return;
      const controls = controlsRef.current;
      if (!controls) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1 && panFrom) {
        // Move the focus so the ground point under the finger stays under the finger.
        const to = { x: e.clientX, y: e.clientY };
        const a = groundAt(panFrom, hitA);
        const b = groundAt(to, hitB);
        panFrom = to;
        if (!a || !b) return;
        controls.getTarget(target, true);
        void controls.moveTo(target.x + a.x - b.x, 0, target.z + a.z - b.z, false);
        invalidate();
        return;
      }

      const current = fingers();
      if (!pair || !current) return;
      if (pair.mode === 'pending') pair.mode = classifyTwoFinger(pair.start, current);
      const delta = twoFingerDelta(pair.prev, current);
      pair.prev = current;

      if (pair.mode === 'twist') {
        void controls.rotate(delta.angle, 0, false);
      } else if (pair.mode === 'pinch') {
        if (mode === 'orbit') void controls.dolly(controls.distance * (1 - 1 / delta.scale), false);
        else void controls.zoomTo(controls.camera.zoom * delta.scale, false);
      } else if (pair.mode === 'tilt' && mode === 'orbit') {
        // Dragging up tilts toward the horizon, as in map apps.
        void controls.rotate(0, (-delta.dy / size.height) * Math.PI, false);
      }
      // Instant camera-controls moves fire no event, so ask for the frame ourselves.
      invalidate();
    };

    const onUp = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return;
      pair = null;
      // A finger left after a two-finger gesture starts a fresh pan.
      const [remaining] = [...pointers.values()];
      panFrom = remaining ?? null;
    };

    element.addEventListener('pointerdown', onDown);
    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerup', onUp);
    element.addEventListener('pointercancel', onUp);
    return () => {
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointercancel', onUp);
    };
  }, [element, controlsRef, mode, size.height, invalidate]);
}
