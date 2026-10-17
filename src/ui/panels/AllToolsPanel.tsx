import { useState } from 'react';
import { useSession } from '../../app/state/session';
import { useRole } from '../../app/state/useRole';
import { focusRing } from '../controls';
import { searchTools, toolsForRole } from '../tool-rail/core/tools';
import { GROUPS, TOOLS } from '../tool-rail/registry';

/** Phone tool picker: every tool for this role, grouped, with search (Visual.md §7.4). */
export function AllToolsPanel() {
  const role = useRole();
  const openTool = useSession((s) => s.openTool);
  const [query, setQuery] = useState('');
  const tools = searchTools(toolsForRole(TOOLS, role), query);

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-pewter">Search tools</span>
        <input
          type="search"
          name="tool-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Measure, lights…"
          autoComplete="off"
          spellCheck={false}
          className={`min-h-12 rounded-input border border-line bg-felt-800 px-3 text-base text-bone placeholder:text-pewter ${focusRing}`}
        />
      </label>
      {tools.length === 0 && <p className="text-sm text-pewter">No tools match “{query}”.</p>}
      {GROUPS.map((group) => {
        const inGroup = tools.filter((t) => t.group === group.id);
        if (inGroup.length === 0) return null;
        return (
          <section key={group.id} aria-label={group.label} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-bone">{group.label}</h3>
            <div className="grid grid-cols-3 gap-2">
              {inGroup.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => openTool(tool.id)}
                    className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-button bg-felt-800 p-2 text-center text-xs text-bone transition-[background-color] hover:bg-felt-700 ${focusRing}`}
                  >
                    <Icon aria-hidden="true" size={20} strokeWidth={1.75} />
                    <span className="line-clamp-2 leading-tight">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
