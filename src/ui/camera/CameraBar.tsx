import { LocateFixed, Map, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { useSession } from '../../app/state/session';
import { useSettings } from '../../app/state/settings';
import { cameraActions } from '../../scene/camera-actions';
import { IconButton } from '../controls';
import type { LayoutMode } from '../layout/useLayoutMode';

/** The frequent camera actions as buttons; the Camera panel has the full set. */
export function CameraBar({ layout }: { layout: LayoutMode }) {
  const mode = useSession((s) => s.cameraMode);
  const setMode = useSession((s) => s.setCameraMode);
  const side = useSettings((s) => s.railSide);
  const compact = layout !== 'desktop';
  const size = compact ? 'sm' : 'md';

  const position = compact
    ? `bottom-[max(16px,env(safe-area-inset-bottom))] ${side === 'right' ? 'left-2' : 'right-2'}`
    : 'bottom-4 left-1/2 -translate-x-1/2';

  return (
    <div
      role="group"
      aria-label="Camera"
      className={`felt absolute z-10 flex gap-0.5 rounded-panel p-1 shadow-[inset_0_2px_10px_rgb(0_0_0/0.45)] ${position}`}
    >
      <IconButton
        size={size}
        icon={RotateCcw}
        label="Rotate left (Q)"
        onClick={() => cameraActions.rotateStep(-1)}
      />
      <IconButton
        size={size}
        icon={RotateCw}
        label="Rotate right (E)"
        onClick={() => cameraActions.rotateStep(1)}
      />
      <IconButton
        size={size}
        icon={ZoomIn}
        label="Zoom in"
        onClick={() => cameraActions.zoomStep(1)}
      />
      <IconButton
        size={size}
        icon={ZoomOut}
        label="Zoom out"
        onClick={() => cameraActions.zoomStep(-1)}
      />
      <IconButton
        size={size}
        icon={Map}
        label="Top-down view"
        aria-pressed={mode === 'topdown'}
        onClick={() => setMode(mode === 'topdown' ? 'orbit' : 'topdown')}
      />
      <IconButton size={size} icon={LocateFixed} label="Reset view" onClick={cameraActions.reset} />
    </div>
  );
}
