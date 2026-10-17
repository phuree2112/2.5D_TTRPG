import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { isEditableTarget } from '../../app/dom';
import { useSession } from '../../app/state/session';
import { useSettings } from '../../app/state/settings';
import { useTokens } from '../../app/state/tokens';
import { cameraActions } from '../../scene/camera-actions';
import { claimPointer, releasePointer } from '../../scene/pointer-ownership';
import { hitFlat, hitUpright } from '../core/picking';
import {
  footprintCenter,
  formatDistance,
  gridDistance,
  snapCell,
  tokenDiameter,
} from '../core/rules';
import { useTokenDrag } from '../drag-state';

// Token selection and movement (Prompt §4.4, Engineering.md §8.2–8.3):
// drag to move with grid snapping and live distance; tap a token then tap a cell with the
// Move tool (WCAG 2.5.7); arrow keys move the selected token one cell relative to the view.

const DRAG_PX = 6;
const TOOLS = new Set(['select', 'move']);

type Press = {
  pointerId: number;
  tokenId: string | null;
  startX: number;
  startY: number;
  dragging: boolean;
};

export function TokenInteraction() {
  const element = useThree((s) => s.gl.domElement);
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    const ground = new Plane(new Vector3(0, 1, 0), 0);
    const hit = new Vector3();
    let press: Press | null = null;
    let spaceDown = false;

    const ray = (x: number, y: number) => {
      const rect = element.getBoundingClientRect();
      ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, get().camera);
      return raycaster.ray;
    };

    const groundAt = (x: number, y: number) => {
      const p = ray(x, y).intersectPlane(ground, hit);
      return p ? { x: p.x, z: p.z } : null;
    };

    const visibleTokens = () => {
      const { tokens, order } = useTokens.getState();
      const player = useSettings.getState().viewAsPlayer;
      return order.map((id) => tokens[id]!).filter((t) => t && !(player && t.hidden));
    };

    const pick = (x: number, y: number): string | null => {
      const three = ray(x, y);
      const r = { origin: three.origin, dir: three.direction };
      const camera = get().camera.position;
      const grid = useSettings.getState().grid;
      let best: { id: string; t: number } | null = null;
      for (const token of visibleTokens()) {
        const c = footprintCenter(grid, token.cell, token.size);
        const d = tokenDiameter(token.size);
        const t =
          token.displayMode === 'flat'
            ? hitFlat(r, { x: c.x, y: 0.02, z: c.z }, d / 2)
            : hitUpright(
                r,
                { x: c.x, y: 0, z: c.z },
                d,
                0.06 + d * (token.displayMode === 'popout' ? 1.3 : 1),
                camera,
              );
        if (t !== null && (!best || t < best.t)) best = { id: token.id, t };
      }
      return best?.id ?? null;
    };

    const toolActive = () => TOOLS.has(useSession.getState().activeToolId);

    const onDown = (e: PointerEvent) => {
      if (!toolActive() || spaceDown) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!e.isPrimary) {
        // A second finger means a camera gesture: give the first pointer back.
        if (press && !press.dragging) {
          releasePointer(press.pointerId);
          press = null;
        }
        return;
      }
      const tokenId = pick(e.clientX, e.clientY);
      press = {
        pointerId: e.pointerId,
        tokenId,
        startX: e.clientX,
        startY: e.clientY,
        dragging: false,
      };
      if (tokenId) {
        claimPointer(e.pointerId);
        try {
          element.setPointerCapture(e.pointerId);
        } catch {
          // Synthetic pointers cannot be captured.
        }
        useTokens.getState().select(tokenId);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!press?.tokenId || e.pointerId !== press.pointerId) return;
      if (
        !press.dragging &&
        Math.hypot(e.clientX - press.startX, e.clientY - press.startY) < DRAG_PX
      )
        return;
      press.dragging = true;
      const token = useTokens.getState().tokens[press.tokenId];
      const p = groundAt(e.clientX, e.clientY);
      if (!token || !p) return;
      const grid = useSettings.getState().grid;
      const cell = snapCell(grid, p, token.size);
      useTokenDrag.setState({
        drag: {
          tokenId: token.id,
          x: p.x,
          z: p.z,
          cell,
          distance: formatDistance(gridDistance(grid, token.cell, cell, 'chebyshev')),
          screen: { x: e.clientX, y: e.clientY },
        },
      });
      invalidate();
    };

    const finish = (e: PointerEvent, cancelled: boolean) => {
      if (!press || e.pointerId !== press.pointerId) return;
      const { tokenId, dragging, startX, startY } = press;
      press = null;
      if (tokenId) {
        releasePointer(e.pointerId);
        const drag = useTokenDrag.getState().drag;
        if (dragging && drag && !cancelled) useTokens.getState().moveToken(tokenId, drag.cell);
        useTokenDrag.setState({ drag: null });
      } else if (!cancelled && Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_PX) {
        // A tap on the floor: Move tool moves the selected token there; Select deselects.
        const { selectedId, tokens, moveToken, select } = useTokens.getState();
        const selected = selectedId ? tokens[selectedId] : undefined;
        const p = groundAt(e.clientX, e.clientY);
        if (useSession.getState().activeToolId === 'move' && selected && p) {
          moveToken(selected.id, snapCell(useSettings.getState().grid, p, selected.size));
        } else {
          select(null);
        }
      }
      invalidate();
    };
    const onUp = (e: PointerEvent) => finish(e, false);
    const onCancel = (e: PointerEvent) => finish(e, true);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown = e.type === 'keydown';
      if (e.type !== 'keydown' || e.altKey || e.ctrlKey || e.metaKey || isEditableTarget(e.target))
        return;
      const onScene = e.target === document.body || e.target === element;
      const { selectedId, tokens, moveToken, select } = useTokens.getState();
      const token = selectedId ? tokens[selectedId] : undefined;
      if (!token || !onScene) return;
      if (e.key === 'Escape' && !useSession.getState().openPanel) {
        select(null);
        return;
      }
      const keys: Record<string, [number, number]> = {
        ArrowUp: [1, 0],
        ArrowDown: [-1, 0],
        ArrowRight: [0, 1],
        ArrowLeft: [0, -1],
      };
      const step = keys[e.key];
      if (!step) return;
      e.preventDefault();
      // Up = away from the camera, snapped to the nearest grid axis.
      const { azimuth } = cameraActions.getView();
      let ux = -Math.sin(azimuth);
      let uz = -Math.cos(azimuth);
      if (Math.abs(ux) > Math.abs(uz)) [ux, uz] = [Math.sign(ux), 0];
      else [ux, uz] = [0, Math.sign(uz)];
      const [forward, right] = step;
      const dx = ux * forward + -uz * right;
      const dz = uz * forward + ux * right;
      const grid = useSettings.getState().grid;
      const c = footprintCenter(grid, token.cell, token.size);
      moveToken(token.id, snapCell(grid, { x: c.x + dx, z: c.z + dz }, token.size));
    };

    element.addEventListener('pointerdown', onDown, { capture: true });
    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerup', onUp);
    element.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      element.removeEventListener('pointerdown', onDown, { capture: true });
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [element, get, invalidate]);

  return null;
}
