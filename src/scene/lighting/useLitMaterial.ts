import { useEffect, useMemo } from 'react';
import { MeshLambertMaterial } from 'three';
import type { Texture } from 'three';
import { withLightPool } from './light-pool';

/** A Lambert material that receives the light pool and cloud shadows. */
export function useLitMaterial({
  color,
  map,
}: {
  color?: string;
  map?: Texture;
}): MeshLambertMaterial {
  const material = useMemo(
    () =>
      withLightPool(
        new MeshLambertMaterial({ ...(color ? { color } : {}), ...(map ? { map } : {}) }),
      ),
    [color, map],
  );
  useEffect(() => () => material.dispose(), [material]);
  return material;
}
