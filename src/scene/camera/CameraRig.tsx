import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  CameraControls,
  CameraControlsImpl,
  OrthographicCamera,
  PerspectiveCamera,
} from '@react-three/drei';
import { Box3, Vector3 } from 'three';
import type { OrthographicCamera as OrthoCam, PerspectiveCamera as PerspCam } from 'three';
import {
  DEFAULT_AZIMUTH,
  DEFAULT_POLAR,
  FIELD_OF_VIEW,
  snapAzimuth,
  stepAzimuth,
} from '../core/camera';
import { gridExtent } from '../core/grid';
import { setCameraDriver } from '../camera-actions';
import { useSession } from '../../app/state/session';
import { useSettings } from '../../app/state/settings';
import { useReducedMotion } from '../../app/state/useReducedMotion';
import { useTouchGestures } from './useTouchGestures';
import { isEditableTarget } from '../../app/dom';

const { ACTION } = CameraControlsImpl;
const QUARTER = Math.PI / 2;
const TILT_STEP = (10 * Math.PI) / 180;
const BOUNDARY_MARGIN = 2;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

// Survives the remount when switching between orbit and top-down.
const memory = { target: null as Vector3 | null, azimuth: DEFAULT_AZIMUTH, polar: DEFAULT_POLAR };

export function CameraRig() {
  const mode = useSession((s) => s.cameraMode);
  const grid = useSettings((s) => s.grid);
  const reducedMotion = useReducedMotion();
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const [perspective, setPerspective] = useState<PerspCam | null>(null);
  const [orthographic, setOrthographic] = useState<OrthoCam | null>(null);
  const controlsRef = useRef<CameraControlsImpl>(null);
  const camera = mode === 'orbit' ? perspective : orthographic;

  const extent = gridExtent(grid);
  const center = new Vector3(extent.width / 2, 0, extent.depth / 2);
  // Close enough to read as a miniature diorama, not a map (Visual.md §2.3).
  const defaultDistance = Math.min(Math.max(extent.width, extent.depth) * 0.9, 40);
  const fitZoom = Math.min(
    size.width / (extent.width + BOUNDARY_MARGIN * 2),
    size.height / (extent.depth + BOUNDARY_MARGIN * 2),
  );

  // Configure the controls for the current mode whenever they are (re)created.
  useEffect(() => {
    const c = controlsRef.current;
    if (!c || !camera) return;
    c.touches.one = ACTION.NONE;
    c.touches.two = ACTION.NONE;
    c.touches.three = ACTION.NONE;
    c.mouseButtons.left = ACTION.NONE;
    c.mouseButtons.middle = ACTION.TRUCK;
    c.smoothTime = 0.25;
    c.draggingSmoothTime = 0.1;
    c.setBoundary(
      new Box3(
        new Vector3(-BOUNDARY_MARGIN, 0, -BOUNDARY_MARGIN),
        new Vector3(extent.width + BOUNDARY_MARGIN, 0, extent.depth + BOUNDARY_MARGIN),
      ),
    );
    const target = memory.target ?? center;
    void c.moveTo(target.x, 0, target.z, false);

    if (mode === 'orbit') {
      c.minDistance = 4;
      c.maxDistance = 80;
      c.dollyToCursor = true;
      c.verticalDragToForward = true;
      c.mouseButtons.right = ACTION.ROTATE;
      c.mouseButtons.wheel = ACTION.DOLLY;
      void c.rotateTo(memory.azimuth, memory.polar, false);
      void c.dollyTo(defaultDistance, false);
    } else {
      c.minPolarAngle = 0;
      c.maxPolarAngle = 0;
      c.minZoom = fitZoom / 4;
      c.maxZoom = fitZoom * 8;
      c.verticalDragToForward = false;
      c.mouseButtons.right = ACTION.NONE;
      c.mouseButtons.wheel = ACTION.ZOOM;
      void c.rotateTo(Math.round(memory.azimuth / QUARTER) * QUARTER, 0, false);
      void c.zoomTo(fitZoom, false);
    }
    invalidate();
    // Only when the controls or grid change; fitZoom and distance are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, mode, grid, invalidate]);

  // Tilt limits from Settings (Prompt §3). Re-clamps the current view when they change.
  const tilt = useSettings((s) => s.tiltRange);
  useEffect(() => {
    const c = controlsRef.current;
    if (!c || mode !== 'orbit') return;
    c.minPolarAngle = radians(tilt.min);
    c.maxPolarAngle = radians(tilt.max);
    const clamped = Math.min(Math.max(c.polarAngle, c.minPolarAngle), c.maxPolarAngle);
    void c.rotatePolarTo(clamped, false);
    invalidate();
  }, [tilt.min, tilt.max, mode, camera, invalidate]);

  // Buttons and shortcuts drive the camera through this bridge (scene/camera-actions.ts).
  // Every action requests a frame: an instant move (Reduced Motion) fires no camera-controls
  // event, so drei would not redraw and the move would stay invisible.
  useEffect(() => {
    const transition = !reducedMotion;
    const act = (move: (controls: CameraControlsImpl) => void) => {
      const controls = controlsRef.current;
      if (!controls) return;
      move(controls);
      invalidate();
    };
    const quarterStep = (azimuth: number, direction: number) =>
      (Math.round(azimuth / QUARTER) + direction) * QUARTER;

    return setCameraDriver({
      rotateStep: (direction) =>
        act((c) => {
          const next =
            mode === 'orbit'
              ? stepAzimuth(c.azimuthAngle, direction)
              : quarterStep(c.azimuthAngle, direction);
          void c.rotateAzimuthTo(next, transition);
        }),
      snap45: () =>
        act((c) => {
          const next =
            mode === 'orbit' ? snapAzimuth(c.azimuthAngle) : quarterStep(c.azimuthAngle, 0);
          void c.rotateAzimuthTo(next, transition);
        }),
      reset: () =>
        act((c) => {
          void c.moveTo(center.x, 0, center.z, transition);
          if (mode === 'orbit') {
            void c.rotateTo(DEFAULT_AZIMUTH, DEFAULT_POLAR, transition);
            void c.dollyTo(defaultDistance, transition);
          } else {
            void c.rotateTo(0, 0, transition);
            void c.zoomTo(fitZoom, transition);
          }
        }),
      zoomStep: (direction) =>
        act((c) => {
          if (mode === 'orbit') void c.dolly(direction * c.distance * 0.25, transition);
          else void c.zoomTo(c.camera.zoom * (direction > 0 ? 1.25 : 0.8), transition);
        }),
      getView: () => {
        const c = controlsRef.current;
        if (!c) return { azimuth: memory.azimuth, target: { x: center.x, z: center.z } };
        const t = c.getTarget(new Vector3(), true);
        return { azimuth: c.azimuthAngle, target: { x: t.x, z: t.z } };
      },
      tiltStep: (direction) =>
        act((c) => {
          if (mode === 'orbit')
            void c.rotatePolarTo(c.polarAngle - direction * TILT_STEP, transition);
        }),
    });
  }, [mode, reducedMotion, invalidate, center.x, center.z, defaultDistance, fitZoom]);

  // Space + left drag pans (Prompt §3).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const controls = controlsRef.current;
      if (event.code !== 'Space' || !controls || isEditableTarget(event.target)) return;
      event.preventDefault();
      controls.mouseButtons.left = event.type === 'keydown' ? ACTION.TRUCK : ACTION.NONE;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, []);

  useTouchGestures(controlsRef, mode);

  // Remember the view across mode switches and publish it for tests and the debug overlay.
  const scratch = useRef(new Vector3());
  useFrame(() => {
    const controls = controlsRef.current;
    const d = window.__DIORAMA_DIAGNOSTICS__;
    if (!controls) return;
    const target = controls.getTarget(scratch.current, true);
    memory.target = (memory.target ?? new Vector3()).copy(target);
    memory.azimuth = controls.azimuthAngle;
    if (mode === 'orbit') memory.polar = controls.polarAngle;
    if (!d) return;
    d.camera.mode = mode;
    d.camera.azimuth = controls.azimuthAngle;
    d.camera.polar = controls.polarAngle;
    d.camera.distance = controls.distance;
    d.camera.zoom = controls.camera.zoom;
    d.camera.target = [target.x, target.y, target.z];
  });

  return (
    <>
      <PerspectiveCamera
        ref={setPerspective}
        makeDefault={mode === 'orbit'}
        fov={FIELD_OF_VIEW}
        near={0.1}
        far={500}
        position={[center.x + 20, 25, center.z + 20]}
      />
      <OrthographicCamera
        ref={setOrthographic}
        makeDefault={mode === 'topdown'}
        near={0.1}
        far={500}
        position={[center.x, 60, center.z]}
      />
      {camera && <CameraControls key={mode} ref={controlsRef} camera={camera} makeDefault />}
    </>
  );
}
