import type { DisplayMode, Faction } from '../../app/state/tokens';
import type { SizeCategory } from '../../tokens/core/rules';
import { focusRing, Segmented } from '../controls';

const SIZES: { value: SizeCategory; label: string }[] = [
  { value: 'tiny', label: 'Tiny' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'huge', label: 'Huge' },
  { value: 'gargantuan', label: 'Gargantuan' },
];

const FACTIONS: { value: Faction; label: string }[] = [
  { value: 'player', label: 'Player' },
  { value: 'enemy', label: 'Enemy' },
  { value: 'ally', label: 'Ally' },
  { value: 'neutral', label: 'Neutral' },
];

const MODES: { value: DisplayMode; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'standee', label: 'Standee' },
  { value: 'popout', label: 'Pop-out' },
];

export function ModeField({
  value,
  onChange,
}: {
  value: DisplayMode;
  onChange: (v: DisplayMode) => void;
}) {
  return (
    <Segmented
      label="Display"
      name="display-mode"
      value={value}
      onChange={onChange}
      options={MODES}
    />
  );
}

export function FactionField({
  value,
  onChange,
}: {
  value: Faction;
  onChange: (v: Faction) => void;
}) {
  return (
    <Segmented label="Side" name="faction" value={value} onChange={onChange} options={FACTIONS} />
  );
}

export function SizeField({
  value,
  onChange,
}: {
  value: SizeCategory;
  onChange: (v: SizeCategory) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-pewter">Size</span>
      <select
        name="token-size"
        value={value}
        onChange={(e) => onChange(e.target.value as SizeCategory)}
        className={`min-h-12 rounded-input border border-line bg-felt-800 px-3 text-base text-bone ${focusRing}`}
      >
        {SIZES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function NameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-pewter">Name</span>
      <input
        name="token-name"
        value={value}
        maxLength={60}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-12 rounded-input border border-line bg-felt-800 px-3 text-base text-bone ${focusRing}`}
      />
    </label>
  );
}
