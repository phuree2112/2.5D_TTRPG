import { useSettings } from '../../app/state/settings';
import type { MotionSetting, RailSide } from '../../app/state/settings';
import type { GridSpec } from '../../scene/core/grid';
import { focusRing, Segmented, Switch } from '../controls';

export function SettingsPanel() {
  const s = useSettings();

  return (
    <>
      <Segmented<RailSide>
        label="Tool rail side"
        name="rail-side"
        value={s.railSide}
        onChange={s.setRailSide}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
        ]}
      />
      <Switch
        label="Single-key shortcuts"
        description="Keys such as V or 1 pick tools. Turn off if they clash with a screen reader or voice control."
        checked={s.singleKeyShortcuts}
        onChange={s.setSingleKeyShortcuts}
      />
      <Segmented<MotionSetting>
        label="Motion"
        name="motion"
        value={s.motion}
        onChange={s.setMotion}
        options={[
          { value: 'system', label: 'Device setting' },
          { value: 'reduced', label: 'Reduced' },
          { value: 'full', label: 'Full' },
        ]}
      />
      <Segmented<GridSpec['type']>
        label="Grid"
        name="grid"
        value={s.grid.type}
        onChange={s.setGridType}
        options={[
          { value: 'square', label: 'Square' },
          { value: 'hex', label: 'Hex' },
        ]}
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm text-pewter">Camera tilt range</legend>
        <TiltSlider
          label="Most overhead"
          value={s.tiltRange.min}
          min={10}
          max={45}
          onChange={(min) => s.setTiltRange({ ...s.tiltRange, min })}
        />
        <TiltSlider
          label="Lowest"
          value={s.tiltRange.max}
          min={50}
          max={85}
          onChange={(max) => s.setTiltRange({ ...s.tiltRange, max })}
        />
      </fieldset>
      <Switch
        label="Preview as a player"
        description="Shows the tools a player sees. Local demo only."
        checked={s.viewAsPlayer}
        onChange={s.setViewAsPlayer}
      />
    </>
  );
}

/** Angle in degrees from looking straight down. */
function TiltSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between text-sm">
        <span className="text-bone">{label}</span>
        <span className="text-pewter tabular-nums">{value}° from straight down</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`h-11 w-full cursor-pointer accent-lantern ${focusRing}`}
      />
    </label>
  );
}
