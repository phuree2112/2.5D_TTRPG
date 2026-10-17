import { useSyncExternalStore } from 'react';
import { useSettings } from './settings';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const media = matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** Settings override the OS preference (Visual.md §8.4). */
export function useReducedMotion(): boolean {
  const motion = useSettings((s) => s.motion);
  const system = useSyncExternalStore(subscribe, () => matchMedia(QUERY).matches);
  return motion === 'reduced' || (motion === 'system' && system);
}
