import {
  ArrowDownToLine,
  ArrowUpToLine,
  Compass,
  LocateFixed,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cameraActions } from '../../scene/camera-actions';
import { useSession } from '../../app/state/session';
import { focusRing, Switch } from '../controls';

// Button alternatives for every camera gesture (WCAG 2.5.1, Engineering.md §8.2).

function Action({
  icon: Icon,
  label,
  hint,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-keyshortcuts={hint}
      className={`flex min-h-12 items-center gap-2 rounded-button bg-felt-800 px-3 text-left text-sm text-bone transition-[background-color] hover:bg-felt-700 disabled:opacity-40 ${focusRing}`}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={1.75} />
      <span className="flex-1">{label}</span>
      {hint && <kbd className="text-xs text-pewter">{hint}</kbd>}
    </button>
  );
}

export function CameraPanel() {
  const mode = useSession((s) => s.cameraMode);
  const setMode = useSession((s) => s.setCameraMode);
  const topDown = mode === 'topdown';

  return (
    <>
      <Switch
        label="Top-down view"
        description="Straight down, without perspective. Good for measuring."
        checked={topDown}
        onChange={(on) => setMode(on ? 'topdown' : 'orbit')}
      />
      <div className="grid grid-cols-2 gap-2">
        <Action
          icon={RotateCcw}
          label="Rotate left"
          hint="Q"
          onClick={() => cameraActions.rotateStep(-1)}
        />
        <Action
          icon={RotateCw}
          label="Rotate right"
          hint="E"
          onClick={() => cameraActions.rotateStep(1)}
        />
        <Action icon={Compass} label="Snap to 45°" onClick={cameraActions.snap45} />
        <Action icon={LocateFixed} label="Reset view" onClick={cameraActions.reset} />
        <Action icon={ZoomIn} label="Zoom in" onClick={() => cameraActions.zoomStep(1)} />
        <Action icon={ZoomOut} label="Zoom out" onClick={() => cameraActions.zoomStep(-1)} />
        <Action
          icon={ArrowUpToLine}
          label="Tilt up"
          onClick={() => cameraActions.tiltStep(1)}
          disabled={topDown}
        />
        <Action
          icon={ArrowDownToLine}
          label="Tilt down"
          onClick={() => cameraActions.tiltStep(-1)}
          disabled={topDown}
        />
      </div>
      <div className="flex flex-col gap-2 text-sm text-pewter">
        <h3 className="text-sm font-semibold text-bone">Mouse</h3>
        <p>Right-drag rotates. Middle-drag or Space + drag pans. Scroll zooms.</p>
        <h3 className="text-sm font-semibold text-bone">Touch</h3>
        <p>
          One finger pans. Twist two fingers to rotate, pinch to zoom, and drag two fingers up or
          down to tilt.
        </p>
      </div>
    </>
  );
}
