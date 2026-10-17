import { useEffect, useRef } from 'react';
import { useTokenDrag } from '../tokens/drag-state';

/** Live distance while dragging a token (Prompt §4.4). Updates the DOM directly, not React state. */
export function DragReadout() {
  const ref = useRef<HTMLOutputElement>(null);

  useEffect(
    () =>
      useTokenDrag.subscribe(({ drag }) => {
        const el = ref.current;
        if (!el) return;
        el.hidden = !drag;
        if (!drag) return;
        el.textContent = drag.distance;
        el.style.transform = `translate(${drag.screen.x + 18}px, ${drag.screen.y - 40}px)`;
      }),
    [],
  );

  return (
    <output
      ref={ref}
      hidden
      aria-live="polite"
      className="pointer-events-none fixed top-0 left-0 z-30 rounded-full bg-felt-900/90 px-3 py-1 font-display text-sm font-semibold text-lantern tabular-nums"
    />
  );
}
