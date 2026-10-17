import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Search } from 'lucide-react';
import { useSession } from '../../app/state/session';
import { useRole } from '../../app/state/useRole';
import { Dialog } from '../Dialog';
import { searchTools, toolsForRole } from '../tool-rail/core/tools';
import { GROUPS, shortcutLabel, TOOLS } from '../tool-rail/registry';

/** Ctrl/Cmd+K: search every tool by name (Prompt §14.1). */
export function CommandPalette() {
  const open = useSession((s) => s.openPanel?.kind === 'palette');
  const closePanel = useSession((s) => s.closePanel);
  const titleId = useId();

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (useSession.getState().openPanel?.kind === 'palette') closePanel();
      }}
      labelledBy={titleId}
    >
      <PaletteBody titleId={titleId} />
    </Dialog>
  );
}

function PaletteBody({ titleId }: { titleId: string }) {
  const role = useRole();
  const openTool = useSession((s) => s.openTool);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();
  const results = searchTools(toolsForRole(TOOLS, role), query);
  const current = results[Math.min(active, results.length - 1)];
  const groupLabel = (id: string) => GROUPS.find((g) => g.id === id)?.label ?? '';

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length === 0) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + results.length) % results.length);
    } else if (event.key === 'Enter' && current) {
      event.preventDefault();
      openTool(current.id);
    }
  };

  return (
    <div className="flex max-h-[76vh] flex-col">
      <h2 id={titleId} className="sr-only">
        Search tools
      </h2>
      <div className="flex items-center gap-2 border-b border-felt-700 px-4 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-lantern">
        <Search aria-hidden="true" size={18} className="text-pewter" />
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
          aria-label="Search tools"
          name="tool-search"
          placeholder="Search tools…"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="min-h-14 flex-1 bg-transparent text-base text-bone outline-none placeholder:text-pewter"
        />
      </div>
      <ul id={listId} role="listbox" aria-label="Tools" className="overflow-y-auto p-2">
        {results.map((tool) => {
          const Icon = tool.icon;
          const selected = tool === current;
          return (
            <li
              key={tool.id}
              id={`${listId}-${tool.id}`}
              role="option"
              aria-selected={selected}
              onClick={() => openTool(tool.id)}
              onMouseMove={() => setActive(results.indexOf(tool))}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-button px-3 text-sm ${
                selected ? 'bg-felt-800 text-bone' : 'text-pewter'
              }`}
            >
              <Icon aria-hidden="true" size={18} strokeWidth={1.75} />
              <span className="flex-1 text-bone">{tool.label}</span>
              <span className="text-xs">{groupLabel(tool.group)}</span>
              <kbd className="min-w-14 text-right text-xs">{shortcutLabel(tool.shortcut)}</kbd>
            </li>
          );
        })}
        {results.length === 0 && (
          <li className="px-3 py-4 text-sm text-pewter">No tools match “{query}”.</li>
        )}
      </ul>
    </div>
  );
}
