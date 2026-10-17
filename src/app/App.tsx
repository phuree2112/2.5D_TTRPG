import { lazy, Suspense } from 'react';
import { resolveBackend } from '../data/backend-config';
import { CameraBar } from '../ui/camera/CameraBar';
import { CommandPalette } from '../ui/command-palette/CommandPalette';
import { DebugOverlay } from '../ui/debug/DebugOverlay';
import { useLayoutMode } from '../ui/layout/useLayoutMode';
import { PanelHost } from '../ui/panels/PanelHost';
import { HelpDialog } from '../ui/shortcuts/HelpDialog';
import { useShortcuts } from '../ui/shortcuts/useShortcuts';
import { DesktopRail, MobileRail } from '../ui/tool-rail/ToolRail';
import { ToolRailProvider } from '../ui/tool-rail/ToolRailContext';
import { TopBar } from '../ui/TopBar';

// three.js and R3F load in their own chunk, keeping the main bundle small (Engineering.md §17).
const SceneCanvas = lazy(() => import('../scene/SceneCanvas'));

const backend = resolveBackend(import.meta.env);
const debug = new URLSearchParams(window.location.search).get('debug') === '1';

export function App() {
  const layout = useLayoutMode();
  useShortcuts();

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

      <TopBar localDemo={backend.mode === 'local'} />
      <CameraBar layout={layout} />
      <ToolRailProvider layout={layout}>
        {layout === 'desktop' ? <DesktopRail /> : <MobileRail />}
      </ToolRailProvider>
      <PanelHost layout={layout} />
      <CommandPalette />
      <HelpDialog />
      {debug && <DebugOverlay />}
    </main>
  );
}
