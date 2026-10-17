import { useSyncExternalStore } from 'react';

export type LayoutMode = 'desktop' | 'compact-portrait' | 'compact-landscape';

// Phones: narrow screens, or short ones (a phone held sideways).
const COMPACT = '(max-width: 767px), (max-height: 500px)';
const LANDSCAPE = '(orientation: landscape)';

function subscribe(onChange: () => void) {
  const queries = [matchMedia(COMPACT), matchMedia(LANDSCAPE)];
  queries.forEach((q) => q.addEventListener('change', onChange));
  return () => queries.forEach((q) => q.removeEventListener('change', onChange));
}

function snapshot(): LayoutMode {
  if (!matchMedia(COMPACT).matches) return 'desktop';
  return matchMedia(LANDSCAPE).matches ? 'compact-landscape' : 'compact-portrait';
}

export function useLayoutMode(): LayoutMode {
  return useSyncExternalStore(subscribe, snapshot);
}
