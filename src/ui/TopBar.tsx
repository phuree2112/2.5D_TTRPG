import { CircleHelp, Search } from 'lucide-react';
import { useSession } from '../app/state/session';
import { useSettings } from '../app/state/settings';
import { IconButton } from './controls';

/** Room name on the side away from the rail; search and help on the rail side (Visual.md §7.2). */
export function TopBar({ localDemo }: { localDemo: boolean }) {
  const side = useSettings((s) => s.railSide);
  const setOpenPanel = useSession((s) => s.setOpenPanel);
  const chipSide = side === 'right' ? 'left' : 'right';
  const top = 'top-[max(12px,env(safe-area-inset-top))]';

  return (
    <>
      <header
        className={`pointer-events-none absolute z-10 flex items-center gap-2 ${top} ${
          chipSide === 'left'
            ? 'left-[max(12px,env(safe-area-inset-left))]'
            : 'right-[max(12px,env(safe-area-inset-right))] flex-row-reverse'
        }`}
      >
        <h1 className="rounded-panel bg-felt-900/80 px-3 py-1.5 font-display text-base font-semibold text-bone">
          DioramaTable
        </h1>
        {localDemo && (
          <span
            className="pointer-events-auto rounded-full bg-felt-800 px-3 py-1 text-xs text-pewter"
            title="No backend configured. Rooms are saved in this browser only."
          >
            Local demo
          </span>
        )}
      </header>
      <div
        className={`absolute z-10 flex gap-1 rounded-panel bg-felt-900/80 p-0.5 ${top} ${
          side === 'right' ? 'right-3' : 'left-3'
        }`}
      >
        <IconButton
          size="sm"
          icon={Search}
          label="Search tools (Ctrl+K)"
          aria-keyshortcuts="Control+K Meta+K"
          onClick={() => setOpenPanel({ kind: 'palette' })}
        />
        <IconButton
          size="sm"
          icon={CircleHelp}
          label="Keyboard shortcuts (?)"
          onClick={() => setOpenPanel({ kind: 'help' })}
        />
      </div>
    </>
  );
}
