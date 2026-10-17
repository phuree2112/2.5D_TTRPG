import { useId, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { Pin, PinOff, X } from 'lucide-react';
import { useSession } from '../../app/state/session';
import { useSettings } from '../../app/state/settings';
import { useRole } from '../../app/state/useRole';
import { IconButton } from '../controls';
import type { LayoutMode } from '../layout/useLayoutMode';
import { focusToolButton } from '../tool-rail/focus';
import { DEFAULT_PINS, findTool } from '../tool-rail/registry';
import { AllToolsPanel } from './AllToolsPanel';
import { CameraPanel } from './CameraPanel';
import { ComingSoon } from './ComingSoon';
import { QualityPanel } from './QualityPanel';
import { SettingsPanel } from './SettingsPanel';
import { SelectPanel } from './SelectPanel';
import { TokenLibraryPanel } from './TokenLibraryPanel';
import { ImportTokenPanel } from './ImportTokenPanel';
import { EnvironmentPanel } from './EnvironmentPanel';

const BUILT: Record<string, () => ReactNode> = {
  camera: () => <CameraPanel />,
  quality: () => <QualityPanel />,
  settings: () => <SettingsPanel />,
  select: () => <SelectPanel tool="select" />,
  move: () => <SelectPanel tool="move" />,
  'token-library': () => <TokenLibraryPanel />,
  'import-token': () => <ImportTokenPanel />,
  environment: () => <EnvironmentPanel />,
};

/** Shows the open tool's options: a flyout beside the rail, or a sheet on phones. */
export function PanelHost({ layout }: { layout: LayoutMode }) {
  const open = useSession((s) => s.openPanel);
  const closePanel = useSession((s) => s.closePanel);

  if (open?.kind !== 'tool' && open?.kind !== 'all-tools') return null;

  const close = () => {
    closePanel();
    if (open.kind === 'tool') focusToolButton(open.toolId);
  };

  if (open.kind === 'all-tools') {
    return (
      <Container layout={layout} title="All tools" onClose={close}>
        <AllToolsPanel />
      </Container>
    );
  }

  const tool = findTool(open.toolId);
  if (!tool) return null;
  return (
    <Container layout={layout} title={tool.label} toolId={tool.id} onClose={close}>
      <p className="text-sm text-pewter">{tool.summary}</p>
      {BUILT[tool.id]?.() ?? <ComingSoon phase={tool.arrivesIn} />}
    </Container>
  );
}

function Container({
  layout,
  title,
  toolId,
  onClose,
  children,
}: {
  layout: LayoutMode;
  title: string;
  toolId?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const side = useSettings((s) => s.railSide);
  const headingId = useId();
  const header = <Header id={headingId} title={title} toolId={toolId} onClose={onClose} />;
  const body = <div className="flex flex-col gap-5 px-4 pb-6">{children}</div>;

  if (layout === 'desktop') {
    return (
      <section
        role="dialog"
        aria-labelledby={headingId}
        className={`absolute top-16 z-20 flex max-h-[calc(100%-80px)] w-80 flex-col overflow-y-auto overscroll-contain rounded-panel bg-felt-900 shadow-[0_12px_32px_rgb(0_0_0/0.45)] ${
          side === 'right' ? 'right-[100px]' : 'left-[100px]'
        }`}
      >
        {header}
        {body}
      </section>
    );
  }

  return (
    <Sheet layout={layout} side={side} headingId={headingId}>
      {header}
      {body}
    </Sheet>
  );
}

function Header({
  id,
  title,
  toolId,
  onClose,
}: {
  id: string;
  title: string;
  toolId?: string;
  onClose: () => void;
}) {
  const role = useRole();
  const pinned = useSettings((s) => s.pinnedTools ?? DEFAULT_PINS[role]);
  const togglePin = useSettings((s) => s.togglePin);
  const isPinned = toolId ? pinned.includes(toolId) : false;

  return (
    <header className="sticky top-0 z-10 flex items-center gap-1 bg-felt-900 py-1 pr-1 pl-4">
      <h2 id={id} className="flex-1 text-lg font-semibold text-bone">
        {title}
      </h2>
      {toolId && (
        <IconButton
          icon={isPinned ? PinOff : Pin}
          label={isPinned ? 'Unpin from rail' : 'Pin to rail'}
          aria-pressed={isPinned}
          onClick={() => togglePin(toolId, DEFAULT_PINS[role])}
        />
      )}
      <IconButton icon={X} label="Close" onClick={onClose} />
    </header>
  );
}

type SheetSize = 'half' | 'full';

/** Phone panel: bottom sheet in portrait, side sheet in landscape (Visual.md §7.4–7.5). */
function Sheet({
  layout,
  side,
  headingId,
  children,
}: {
  layout: LayoutMode;
  side: 'left' | 'right';
  headingId: string;
  children: ReactNode;
}) {
  const [size, setSize] = useState<SheetSize>('half');
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startHeight: number } | null>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const closePanel = useSession((s) => s.closePanel);

  // The rail column stays clear so the rail never covers the sheet.
  const railGap = side === 'right' ? 'right-[72px] left-0' : 'left-[72px] right-0';

  if (layout === 'compact-landscape') {
    return (
      <section
        role="dialog"
        aria-labelledby={headingId}
        className={`absolute top-0 bottom-0 z-20 w-[min(40vw,380px)] overflow-y-auto overscroll-contain bg-felt-900 pt-[env(safe-area-inset-top)] shadow-[0_12px_32px_rgb(0_0_0/0.45)] ${
          side === 'right' ? 'right-[72px]' : 'left-[72px]'
        }`}
      >
        {children}
      </section>
    );
  }

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      startY: event.clientY,
      startHeight: sheetRef.current?.getBoundingClientRect().height ?? 0,
    };
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    setDragHeight(Math.max(80, drag.current.startHeight + drag.current.startY - event.clientY));
  };
  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const start = drag.current;
    drag.current = null;
    if (!start) return;
    const moved = Math.abs(event.clientY - start.startY);
    setDragHeight(null);
    if (moved < 6) {
      setSize((s) => (s === 'half' ? 'full' : 'half')); // a tap toggles
      return;
    }
    const fraction = (start.startHeight + start.startY - event.clientY) / window.innerHeight;
    if (fraction < 0.3) closePanel();
    else setSize(fraction > 0.7 ? 'full' : 'half');
  };

  return (
    <section
      ref={sheetRef}
      role="dialog"
      aria-labelledby={headingId}
      style={dragHeight ? { height: dragHeight } : undefined}
      className={`absolute bottom-0 z-20 flex flex-col overflow-y-auto overscroll-contain rounded-t-panel bg-felt-900 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_rgb(0_0_0/0.45)] ${railGap} ${
        size === 'full' ? 'h-[90dvh]' : 'h-[50dvh]'
      }`}
    >
      <button
        type="button"
        aria-label={size === 'half' ? 'Expand panel' : 'Shrink panel'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSize((s) => (s === 'half' ? 'full' : 'half'));
          }
        }}
        className="grid h-6 w-full shrink-0 touch-none place-items-center pt-2"
      >
        <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-felt-700" />
      </button>
      {children}
    </section>
  );
}
