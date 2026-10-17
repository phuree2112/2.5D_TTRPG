import { lazy, Suspense } from 'react';
import { resolveBackend } from '../data/backend-config';

// three.js and R3F load in their own chunk, keeping the main bundle small (Engineering.md §17).
const SceneCanvas = lazy(() => import('../scene/SceneCanvas'));

const backend = resolveBackend(import.meta.env);

export function App() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-felt-900">
      <Suspense
        fallback={
          <p className="absolute inset-0 grid place-items-center text-pewter" role="status">
            Loading the table…
          </p>
        }
      >
        <SceneCanvas />
      </Suspense>

      <header className="pointer-events-none absolute top-[max(12px,env(safe-area-inset-top))] left-[max(12px,env(safe-area-inset-left))] flex items-center gap-2">
        <h1 className="rounded-panel bg-felt-900/80 px-3 py-1.5 text-base font-semibold text-bone">
          DioramaTable
        </h1>
        {backend.mode === 'local' && (
          <span
            className="pointer-events-auto rounded-full bg-felt-800 px-3 py-1 text-xs text-pewter"
            title="No backend configured. Rooms are saved in this browser only."
          >
            Local demo
          </span>
        )}
      </header>
    </main>
  );
}
