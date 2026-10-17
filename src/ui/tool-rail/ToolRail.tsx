import { useEffect, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, LayoutGrid } from 'lucide-react';
import { focusRing } from '../controls';
import { registerToolButton } from './focus';
import { shortcutLabel } from './registry';
import type { ToolDef } from './registry';
import { useRail } from './rail-context';

// Compound Tool Rail (Visual.md §7.1). Variants compose the parts they need.

const ITEM = 'data-rail-item';

function Frame({ label, children }: { label: string; children: ReactNode }) {
  const { state } = useRail();
  const ref = useRef<HTMLDivElement>(null);
  const current = useRef<string | null>(null);

  // Roving tab stop: one item in the rail is tabbable; arrow keys move between items.
  useEffect(() => {
    const items = [...(ref.current?.querySelectorAll<HTMLElement>(`[${ITEM}]`) ?? [])];
    const keep =
      items.find((el) => el.dataset.railId === current.current) ??
      items.find((el) => el.dataset.railId === state.activeToolId) ??
      items[0];
    items.forEach((el) => (el.tabIndex = el === keep ? 0 : -1));
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(ref.current?.querySelectorAll<HTMLElement>(`[${ITEM}]`) ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    const go = (i: number) => {
      const el = items[(i + items.length) % items.length];
      if (!el) return;
      current.current = el.dataset.railId ?? null;
      items.forEach((item) => (item.tabIndex = item === el ? 0 : -1));
      el.focus();
    };
    if (event.altKey) return; // Alt+arrows reorder pins (handled on the pinned buttons).
    if (event.key === 'ArrowDown') go(index + 1);
    else if (event.key === 'ArrowUp') go(index - 1);
    else if (event.key === 'Home') go(0);
    else if (event.key === 'End') go(items.length - 1);
    else return;
    event.preventDefault();
  };

  const compact = state.layout !== 'desktop';
  const sideClass = state.side === 'right' ? 'right-3' : 'left-3';
  const position = compact
    ? `${state.side === 'right' ? 'right-2' : 'left-2'} bottom-[max(16px,env(safe-area-inset-bottom))] w-16`
    : `${sideClass} top-16 bottom-4 w-20`;

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-orientation="vertical"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`felt absolute z-20 flex flex-col gap-1 rounded-rail p-1.5 shadow-[inset_0_2px_10px_rgb(0_0_0/0.45)] ${position}`}
    >
      {children}
    </div>
  );
}

function ToolButton({ tool, pinned = false }: { tool: ToolDef; pinned?: boolean }) {
  const { state, actions } = useRail();
  const active = state.activeToolId === tool.id;
  const open = state.openToolId === tool.id;
  const Icon = tool.icon;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!pinned || !event.altKey) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const button = event.currentTarget;
      actions.movePin(tool.id, event.key === 'ArrowUp' ? -1 : 1);
      requestAnimationFrame(() => button.focus());
    }
  };

  return (
    <button
      type="button"
      {...{ [ITEM]: '' }}
      data-rail-id={pinned ? `pin:${tool.id}` : tool.id}
      ref={(el) => registerToolButton(tool.id, el)}
      aria-pressed={active}
      aria-expanded={open}
      aria-keyshortcuts={shortcutLabel(tool.shortcut)}
      title={`${tool.label} (${shortcutLabel(tool.shortcut)})`}
      onClick={() => actions.openTool(tool.id)}
      onKeyDown={onKeyDown}
      className={`group flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-button px-1 py-1.5 text-center transition-[background-color,color,box-shadow] ${focusRing} ${
        active
          ? 'text-lantern shadow-[inset_0_0_14px_rgb(244_178_62/0.25)]'
          : 'text-pewter hover:bg-felt-800 hover:text-bone'
      } ${open ? 'bg-felt-800' : ''}`}
    >
      <Icon aria-hidden="true" size={22} strokeWidth={1.75} />
      <span className="line-clamp-2 text-xs leading-tight">{tool.label}</span>
    </button>
  );
}

function Pinned({ max }: { max?: number }) {
  const { state } = useRail();
  const tools = max ? state.pinned.slice(0, max) : state.pinned;
  return (
    <div role="group" aria-label="Pinned tools" className="flex flex-col gap-1">
      {tools.map((tool) => (
        <ToolButton key={tool.id} tool={tool} pinned />
      ))}
    </div>
  );
}

function Groups() {
  const { state, actions } = useRail();
  return (
    <div className="flex flex-col gap-1">
      {state.groups.map((group) => {
        const expanded = state.expandedGroup === group.id;
        const tools = state.tools.filter((t) => t.group === group.id);
        const panelId = `rail-group-${group.id}`;
        const Chevron = expanded ? ChevronDown : ChevronRight;
        return (
          <div key={group.id} role="group" aria-label={group.label}>
            <button
              type="button"
              {...{ [ITEM]: '' }}
              data-rail-id={`group:${group.id}`}
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => actions.toggleGroup(group.id)}
              className={`flex min-h-11 w-full items-center justify-center gap-0.5 rounded-button text-xs text-bone transition-[background-color] hover:bg-felt-800 ${focusRing}`}
            >
              {group.label}
              <Chevron aria-hidden="true" size={14} />
            </button>
            {expanded && (
              <div id={panelId} className="flex flex-col gap-1 rounded-button bg-felt-800/60 py-1">
                {tools.map((tool) => (
                  <ToolButton key={tool.id} tool={tool} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AllTools() {
  const { actions } = useRail();
  return (
    <button
      type="button"
      {...{ [ITEM]: '' }}
      data-rail-id="all-tools"
      onClick={actions.openAllTools}
      className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-button text-pewter transition-[background-color,color] hover:bg-felt-800 hover:text-bone ${focusRing}`}
    >
      <LayoutGrid aria-hidden="true" size={22} strokeWidth={1.75} />
      <span className="text-xs leading-tight">All tools</span>
    </button>
  );
}

/** Current level, always visible (Prompt §14.1). Real levels arrive in Phase 6. */
function Levels() {
  return (
    <div role="group" aria-label="Level" className="flex flex-col items-center gap-1 pt-1">
      <span
        {...{ [ITEM]: '' }}
        data-rail-id="level-current"
        tabIndex={0}
        role="status"
        aria-label="Current level: Ground floor. More levels arrive in Phase 6."
        title="Ground floor"
        className={`grid min-h-11 w-full place-items-center rounded-button bg-lantern font-display text-base font-semibold text-ink ${focusRing}`}
      >
        G
      </span>
    </div>
  );
}

function Collapse() {
  const { state, actions } = useRail();
  const Icon = state.side === 'right' ? ChevronsRight : ChevronsLeft;
  return (
    <button
      type="button"
      {...{ [ITEM]: '' }}
      data-rail-id="collapse"
      aria-label="Hide tool rail"
      title="Hide tool rail"
      onClick={() => actions.setCollapsed(true)}
      className={`grid min-h-11 w-full place-items-center rounded-button text-pewter hover:bg-felt-800 hover:text-bone ${focusRing}`}
    >
      <Icon aria-hidden="true" size={18} />
    </button>
  );
}

function Divider() {
  return <hr aria-hidden="true" className="mx-2 my-1 border-felt-700" />;
}

/** The collapsed rail: a slim handle with a 44 px hit area (Visual.md §7.4). */
function Handle() {
  const { state, actions } = useRail();
  return (
    <button
      type="button"
      aria-label="Show tool rail"
      title="Show tool rail"
      onClick={() => actions.setCollapsed(false)}
      className={`absolute bottom-[max(16px,env(safe-area-inset-bottom))] z-20 grid h-16 w-11 place-items-center ${
        state.side === 'right' ? 'right-0' : 'left-0'
      } ${focusRing}`}
    >
      <span aria-hidden="true" className="h-16 w-3 rounded-full bg-felt-700" />
    </button>
  );
}

export function DesktopRail() {
  return (
    <Frame label="Tools">
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain">
        <Pinned />
        <Divider />
        <Groups />
      </div>
      <Divider />
      <Levels />
    </Frame>
  );
}

export function MobileRail() {
  const { state } = useRail();
  if (state.collapsed) return <Handle />;
  return (
    <Frame label="Tools">
      <Pinned max={3} />
      <AllTools />
      <Divider />
      <Levels />
      <Collapse />
    </Frame>
  );
}
