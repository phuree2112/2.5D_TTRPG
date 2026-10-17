import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useSettings } from '../../app/state/settings';
import { useSession } from '../../app/state/session';
import { useRole } from '../../app/state/useRole';
import type { LayoutMode } from '../layout/useLayoutMode';
import { toolsForRole } from './core/tools';
import { DEFAULT_PINS, GROUPS, TOOLS } from './registry';
import { RailContext } from './rail-context';
import type { RailContextValue } from './rail-context';

/** Store-backed implementation of the rail contract. */
export function ToolRailProvider({
  layout,
  children,
}: {
  layout: LayoutMode;
  children: ReactNode;
}) {
  const role = useRole();
  const side = useSettings((s) => s.railSide);
  const pinnedIds = useSettings((s) => s.pinnedTools);
  const togglePin = useSettings((s) => s.togglePin);
  const movePin = useSettings((s) => s.movePin);
  const activeToolId = useSession((s) => s.activeToolId);
  const openPanel = useSession((s) => s.openPanel);
  const expandedGroup = useSession((s) => s.expandedGroup);
  const collapsed = useSession((s) => s.railCollapsed);
  const openTool = useSession((s) => s.openTool);
  const toggleGroup = useSession((s) => s.toggleGroup);
  const setOpenPanel = useSession((s) => s.setOpenPanel);
  const setCollapsed = useSession((s) => s.setRailCollapsed);

  const value = useMemo<RailContextValue>(() => {
    const tools = toolsForRole(TOOLS, role);
    const available = new Set(tools.map((t) => t.id));
    const pins = (pinnedIds ?? DEFAULT_PINS[role]).filter((id) => available.has(id));
    const defaults = DEFAULT_PINS[role];
    return {
      state: {
        side,
        role,
        layout,
        tools,
        groups: GROUPS.filter((g) => g.roles === 'all' || role === 'gm'),
        pinned: pins.map((id) => tools.find((t) => t.id === id)!),
        activeToolId,
        openToolId: openPanel?.kind === 'tool' ? openPanel.toolId : null,
        expandedGroup,
        collapsed,
      },
      actions: {
        openTool,
        toggleGroup,
        togglePin: (id) => togglePin(id, defaults),
        movePin: (id, dir) => movePin(id, dir, defaults),
        openAllTools: () => setOpenPanel({ kind: 'all-tools' }),
        setCollapsed,
      },
    };
  }, [
    role,
    side,
    layout,
    pinnedIds,
    activeToolId,
    openPanel,
    expandedGroup,
    collapsed,
    openTool,
    toggleGroup,
    togglePin,
    movePin,
    setOpenPanel,
    setCollapsed,
  ]);

  return <RailContext value={value}>{children}</RailContext>;
}
