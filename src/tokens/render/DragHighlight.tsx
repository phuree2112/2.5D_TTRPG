import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CircleGeometry, PlaneGeometry } from 'three';
import type { Mesh } from 'three';
import { HEX_SIZE } from '../../scene/core/grid';
import { useSettings } from '../../app/state/settings';
import { useTokens } from '../../app/state/tokens';
import { footprintCenter, SIZE_CELLS } from '../core/rules';
import { useTokenDrag } from '../drag-state';

/** Lantern-lit footprint of the cell a dragged token will land on (Visual.md §3.4). */
export function DragHighlight() {
  const grid = useSettings((s) => s.grid);
  const mesh = useRef<Mesh>(null);
  const geometry = useMemo(
    () =>
      grid.type === 'hex'
        ? new CircleGeometry(HEX_SIZE * 0.98, 6).rotateZ(Math.PI / 6).rotateX(-Math.PI / 2)
        : new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    [grid.type],
  );

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const drag = useTokenDrag.getState().drag;
    const token = drag && useTokens.getState().tokens[drag.tokenId];
    m.visible = Boolean(drag && token);
    if (!drag || !token) return;
    const c = footprintCenter(grid, drag.cell, token.size);
    const n = grid.type === 'hex' ? 1 : Math.max(1, SIZE_CELLS[token.size]);
    m.position.set(c.x, 0.008, c.z);
    m.scale.set(n * 0.96, 1, n * 0.96);
  });

  return (
    <mesh ref={mesh} geometry={geometry} visible={false} renderOrder={2}>
      <meshBasicMaterial color="#f4b23e" transparent opacity={0.35} depthWrite={false} />
    </mesh>
  );
}
