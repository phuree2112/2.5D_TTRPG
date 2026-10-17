import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import {
  Bloom,
  EffectComposer,
  LUT,
  ToneMapping,
  Vignette,
  wrapEffect,
} from '@react-three/postprocessing';
import { KernelSize, LookupTexture, ToneMappingMode } from 'postprocessing';
import { NoToneMapping } from 'three';
import { useSession } from '../../app/state/session';
import { gradeColor } from '../core/atmosphere';
import type { Grade } from '../core/atmosphere';
import { useMood } from '../environment/useMood';
import { setComposerActive } from '../overlay-scene';
import { LinearTiltShiftEffect } from './linear-tilt-shift';

// One composer, merged effects (Engineering.md §7.1, §7.5): bloom and tilt-shift blur at half
// resolution on linear HDR, then AgX tone mapping, the mood's LUT grade, and a vignette.
// Lazy-loaded: Low quality never downloads it.

const LUT_SIZE = 32;
const TiltShift = wrapEffect(LinearTiltShiftEffect);

function buildLut(grade: Grade): LookupTexture {
  const n = LUT_SIZE;
  // LookupTexture uploads as FLOAT, so the data must be a Float32Array (0..1).
  const data = new Float32Array(n * n * n * 4);
  for (let b = 0; b < n; b++) {
    for (let g = 0; g < n; g++) {
      for (let r = 0; r < n; r++) {
        const [R, G, B] = gradeColor([r / (n - 1), g / (n - 1), b / (n - 1)], grade);
        data.set([R, G, B, 1], ((b * n + g) * n + r) * 4);
      }
    }
  }
  const lut = new LookupTexture(data, n);
  lut.needsUpdate = true;
  return lut;
}

export default function PostFX() {
  const mood = useMood();
  const high = useSession((s) => s.preset === 'high');
  const gl = useThree((s) => s.gl);
  const { temperature, saturation, contrast, shadows } = mood.grade;
  const lut = useMemo(
    () => buildLut({ temperature, saturation, contrast, shadows }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [temperature, saturation, contrast, shadows[0], shadows[1], shadows[2]],
  );
  useEffect(() => () => lut.dispose(), [lut]);

  // The composer owns tone mapping while it is mounted (r3f-postprocessing guidance).
  useEffect(() => {
    const previous = gl.toneMapping;
    gl.toneMapping = NoToneMapping;
    setComposerActive(true);
    const d = window.__DIORAMA_DIAGNOSTICS__;
    if (d) d.postfx = true;
    return () => {
      gl.toneMapping = previous;
      setComposerActive(false);
      if (d) d.postfx = false;
    };
  }, [gl]);

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        intensity={mood.bloom}
        // HDR threshold: sunlit ground is above 1.0 before tone mapping, flames and magic far
        // above it. Only they should bloom (Prompt §5.4).
        luminanceThreshold={1.6}
        luminanceSmoothing={0.4}
        resolutionScale={0.5}
      />
      {/* Sharp band: 45 % of the screen, centred 5 % below the middle (Visual.md §2). The
          effect measures from the band centre in units where 2 is the screen height. */}
      <TiltShift
        focusArea={0.75}
        feather={0.3}
        offset={-0.1}
        kernelSize={high ? KernelSize.MEDIUM : KernelSize.SMALL}
        resolutionScale={0.5}
      />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <LUT lut={lut} />
      <Vignette darkness={mood.vignette} offset={0.32} />
    </EffectComposer>
  );
}
