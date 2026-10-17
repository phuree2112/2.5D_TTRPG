// Pure helpers for the tool registry (Engineering.md §15). No React here.

export type Role = 'gm' | 'player';

export type ToolInfo = {
  id: string;
  group: string;
  label: string;
  keywords?: string[];
  roles: 'all' | 'gm';
};

export function toolsForRole<T extends ToolInfo>(tools: T[], role: Role): T[] {
  return role === 'gm' ? tools : tools.filter((tool) => tool.roles === 'all');
}

/** Prefix matches on the label first, then other label or keyword matches. */
export function searchTools<T extends ToolInfo>(tools: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return tools;
  const prefix: T[] = [];
  const other: T[] = [];
  for (const tool of tools) {
    const label = tool.label.toLowerCase();
    if (label.startsWith(q)) prefix.push(tool);
    else if (label.includes(q) || tool.keywords?.some((k) => k.toLowerCase().includes(q)))
      other.push(tool);
  }
  return [...prefix, ...other];
}

export function togglePin(pins: string[], id: string): string[] {
  return pins.includes(id) ? pins.filter((p) => p !== id) : [...pins, id];
}

export function movePin(pins: string[], id: string, dir: 1 | -1): string[] {
  const from = pins.indexOf(id);
  const to = from + dir;
  if (from < 0 || to < 0 || to >= pins.length) return pins;
  const next = [...pins];
  [next[from], next[to]] = [next[to]!, next[from]!];
  return next;
}
