import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useSettings } from '../../app/state/settings';
import { useTokens } from '../../app/state/tokens';
import type { Token } from '../../app/state/tokens';
import { hpStatus } from '../../tokens/core/rules';
import { focusRing, Switch } from '../controls';
import { FactionField, ModeField, NameField, SizeField } from './token-fields';
import { tokenPreview } from './token-preview';

const STATUS = { healthy: 'Healthy', bloodied: 'Bloodied', critical: 'Bloodied', down: 'Down' };

/** Select and Move tools: the selected token's settings, and every token on the table. */
export function SelectPanel({ tool }: { tool: 'select' | 'move' }) {
  const selectedId = useTokens((s) => s.selectedId);
  const token = useTokens((s) => (s.selectedId ? s.tokens[s.selectedId] : undefined));

  return (
    <>
      <p className="text-sm text-bone">
        {tool === 'move'
          ? 'Drag a token to move it, or tap a token and then tap where it should go.'
          : 'Tap a token to select it. Drag to move it; it snaps to the grid.'}{' '}
        Arrow keys move the selected token one cell. Esc deselects.
      </p>
      {token ? <TokenSettings key={selectedId} token={token} /> : null}
      <TokenList />
    </>
  );
}

function TokenSettings({ token }: { token: Token }) {
  const update = useTokens((s) => s.updateToken);
  const remove = useTokens((s) => s.removeToken);
  const gm = useSettings((s) => !s.viewAsPlayer);
  const [confirming, setConfirming] = useState(false);
  const set = (patch: Partial<Token>) => update(token.id, patch);
  const { current, max, temp } = token.hp;

  return (
    <section
      aria-label={`Selected: ${token.name}`}
      className="flex flex-col gap-4 rounded-panel bg-felt-800/60 p-3"
    >
      <div className="flex items-center gap-3">
        <img
          src={tokenPreview(token.imageId)}
          alt=""
          width={48}
          height={48}
          className="rounded-full bg-felt-700 [image-rendering:pixelated]"
        />
        <p className="text-sm text-bone tabular-nums">
          HP {current} / {max}
          {temp > 0 ? ` (+${temp})` : ''}, {STATUS[hpStatus(token.hp)]}
        </p>
      </div>
      <NameField value={token.name} onChange={(name) => set({ name })} />
      <ModeField value={token.displayMode} onChange={(displayMode) => set({ displayMode })} />
      <SizeField value={token.size} onChange={(size) => set({ size })} />
      <FactionField value={token.faction} onChange={(faction) => set({ faction })} />
      {gm && (
        <Switch
          label="Hidden from players"
          description="Players do not receive hidden tokens at all."
          checked={token.hidden}
          onChange={(hidden) => set({ hidden })}
        />
      )}
      <button
        type="button"
        onClick={() => (confirming ? remove(token.id) : setConfirming(true))}
        onBlur={() => setConfirming(false)}
        className={`flex min-h-12 items-center justify-center gap-2 rounded-button bg-felt-800 px-3 text-sm text-ember transition-[background-color] hover:bg-felt-700 ${focusRing}`}
      >
        <Trash2 aria-hidden="true" size={18} />
        {confirming ? `Remove ${token.name}? Select again to confirm` : 'Remove token'}
      </button>
    </section>
  );
}

/** The accessible way into the scene (Visual.md §9.4): every visible token, selectable. */
function TokenList() {
  const tokens = useTokens((s) => s.tokens);
  const order = useTokens((s) => s.order);
  const selectedId = useTokens((s) => s.selectedId);
  const select = useTokens((s) => s.select);
  const player = useSettings((s) => s.viewAsPlayer);
  const list = order.map((id) => tokens[id]!).filter((t) => t && !(player && t.hidden));

  return (
    <section aria-label="On the table" className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-bone">On the table ({list.length})</h3>
      <ul className="flex flex-col gap-1">
        {list.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              aria-pressed={t.id === selectedId}
              onClick={() => select(t.id === selectedId ? null : t.id)}
              className={`flex min-h-11 w-full items-center gap-3 rounded-button px-2 text-left text-sm text-bone transition-[background-color] hover:bg-felt-800 aria-pressed:bg-felt-700 ${focusRing}`}
            >
              <img
                src={tokenPreview(t.imageId)}
                alt=""
                width={32}
                height={32}
                className="rounded-full bg-felt-700 [image-rendering:pixelated]"
              />
              <span className="flex-1 truncate">{t.name}</span>
              <span className="text-xs text-pewter tabular-nums">
                {t.hp.current}/{t.hp.max}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
