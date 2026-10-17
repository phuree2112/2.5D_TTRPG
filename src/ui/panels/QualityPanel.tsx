import { useSettings } from '../../app/state/settings';
import type { QualityMode } from '../../app/state/settings';
import { useSession } from '../../app/state/session';
import { Segmented } from '../controls';

const NAMES = { low: 'Low', medium: 'Medium', high: 'High' } as const;

export function QualityPanel() {
  const mode = useSettings((s) => s.qualityMode);
  const setMode = useSettings((s) => s.setQualityMode);
  const preset = useSession((s) => s.preset);

  return (
    <>
      <Segmented<QualityMode>
        label="Graphics quality"
        name="quality"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'auto', label: 'Auto' },
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ]}
      />
      <p className="text-sm text-bone" aria-live="polite">
        In use now: {NAMES[preset]}
        {mode === 'auto' && '. Auto steps up or down while the camera moves.'}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
        <dt className="text-bone">Low</dt>
        <dd className="text-pewter">Fastest, with no shadows or effects. For older phones.</dd>
        <dt className="text-bone">Medium</dt>
        <dd className="text-pewter">Shadows and effects at reduced resolution. For most phones.</dd>
        <dt className="text-bone">High</dt>
        <dd className="text-pewter">Full resolution shadows and effects. For computers.</dd>
      </dl>
    </>
  );
}
