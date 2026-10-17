import { useId } from 'react';
import { X } from 'lucide-react';
import { useSession } from '../../app/state/session';
import { useSettings } from '../../app/state/settings';
import { useRole } from '../../app/state/useRole';
import { IconButton } from '../controls';
import { Dialog } from '../Dialog';
import { toolsForRole } from '../tool-rail/core/tools';
import { GROUPS, shortcutLabel, TOOLS } from '../tool-rail/registry';

const GENERAL: [string, string][] = [
  ['Ctrl+K or ⌘K', 'Search tools'],
  ['?', 'Keyboard shortcuts'],
  ['Esc', 'Close the open panel'],
];

const CAMERA: [string, string][] = [
  ['Q / E', 'Rotate 45°'],
  ['Right-drag', 'Rotate freely'],
  ['Middle-drag or Space + drag', 'Pan'],
  ['Scroll', 'Zoom'],
  ['Page Up / Page Down', 'Change level (Phase 6)'],
];

function Rows({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-bone">{title}</h3>
      <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-1.5 text-sm">
        {rows.map(([keys, action]) => (
          <div key={action} className="contents">
            <dt>
              <kbd className="text-lantern">{keys}</kbd>
            </dt>
            <dd className="text-pewter">{action}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The help sheet listing every shortcut (Prompt §14.1). */
export function HelpDialog() {
  const open = useSession((s) => s.openPanel?.kind === 'help');
  const closePanel = useSession((s) => s.closePanel);
  const singleKeys = useSettings((s) => s.singleKeyShortcuts);
  const role = useRole();
  const titleId = useId();
  const tools = toolsForRole(TOOLS, role);
  const close = () => {
    if (useSession.getState().openPanel?.kind === 'help') closePanel();
  };

  return (
    <Dialog open={open} onClose={close} labelledBy={titleId}>
      <div className="flex max-h-[76vh] flex-col">
        <header className="flex items-center border-b border-felt-700 py-1 pr-1 pl-4">
          <h2 id={titleId} className="flex-1 text-lg font-semibold">
            Keyboard shortcuts
          </h2>
          <IconButton icon={X} label="Close" onClick={close} />
        </header>
        <div className="flex flex-col gap-6 overflow-y-auto p-4">
          {!singleKeys && (
            <p className="rounded-button bg-felt-800 px-3 py-2 text-sm text-bone">
              Single-key shortcuts are off. Turn them on in Settings.
            </p>
          )}
          <Rows title="General" rows={GENERAL} />
          <Rows title="Camera" rows={CAMERA} />
          {GROUPS.map((group) => {
            const rows = tools
              .filter((t) => t.group === group.id)
              .map((t): [string, string] => [shortcutLabel(t.shortcut), t.label]);
            return rows.length ? <Rows key={group.id} title={group.label} rows={rows} /> : null;
          })}
        </div>
      </div>
    </Dialog>
  );
}
