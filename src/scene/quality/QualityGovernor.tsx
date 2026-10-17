import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { createGovernor, governorStep } from '../core/quality';
import { useSettings } from '../../app/state/settings';
import { useSession } from '../../app/state/session';
import { isActive } from '../activity';

/** Applies the user's quality choice, or steps presets automatically in Auto mode. */
export function QualityGovernor() {
  const mode = useSettings((s) => s.qualityMode);
  const setPreset = useSession((s) => s.setPreset);
  const governor = useRef(createGovernor(useSession.getState().preset));

  useEffect(() => {
    if (mode === 'auto') governor.current = createGovernor(useSession.getState().preset);
    else setPreset(mode);
  }, [mode, setPreset]);

  useFrame((_, delta) => {
    if (mode !== 'auto' || !isActive()) return;
    const result = governorStep(governor.current, delta * 1000);
    governor.current = result.state;
    if (result.change) setPreset(result.state.preset);
  });

  return null;
}
