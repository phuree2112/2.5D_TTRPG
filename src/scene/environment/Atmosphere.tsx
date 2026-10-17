import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, FogExp2, Object3D, SRGBColorSpace } from 'three';
import type { DirectionalLight } from 'three';
import { useEnvironment } from '../../app/state/environment';
import { useSession } from '../../app/state/session';
import type { RGB } from '../core/atmosphere';
import { QUALITY_PRESETS } from '../core/quality';
import { poolUniforms } from '../lighting/light-pool';
import { shadowUniforms } from '../sprites/billboard-material';
import { Parallax, Sky } from './Sky';
import { useMood } from './useMood';
import type { DioramaDiagnostics } from '../diagnostics-global';

// Key light, fill, fog, sky and backdrop from the mood (Visual.md §4.1, Prompt §6).

const SUN_AZIMUTH = (-110 * Math.PI) / 180; // back-left of the default view: shadows fall toward you
const WEATHER = {
  clear: { fog: 1, light: 1, clouds: 1 },
  rain: { fog: 1.6, light: 0.6, clouds: 1.6 },
  snow: { fog: 1.8, light: 0.8, clouds: 1.4 },
  fog: { fog: 3.2, light: 0.75, clouds: 1.2 },
};

const linear = (c: RGB) => new Color().setRGB(c[0], c[1], c[2], SRGBColorSpace);

export function Atmosphere({ center, reach }: { center: { x: number; z: number }; reach: number }) {
  const mood = useMood();
  const weatherId = useEnvironment((s) => s.weather);
  const weather = WEATHER[weatherId];
  const wind = useEnvironment((s) => s.wind);
  const shadowMapSize = useSession((s) => QUALITY_PRESETS[s.preset].shadowMapSize);
  const scene = useThree((s) => s.scene);
  const get = useThree((s) => s.get);
  const target = useMemo(() => new Object3D(), []);
  const published = useRef<DioramaDiagnostics['atmosphere']>(undefined);
  // Published per frame: the diagnostics object may not exist yet when the effect first runs.
  useFrame(() => {
    const d = window.__DIORAMA_DIAGNOSTICS__;
    if (d) d.atmosphere = published.current;
  });

  const elevation = (mood.key.elevation * Math.PI) / 180;
  const direction: [number, number, number] = [
    Math.cos(elevation) * Math.sin(SUN_AZIMUTH),
    Math.sin(elevation),
    Math.cos(elevation) * Math.cos(SUN_AZIMUTH),
  ];
  const distance = reach * 1.2;
  const half = reach / 2 + 2;
  const keyIntensity = mood.key.intensity * weather.light;

  useLayoutEffect(() => {
    const fog =
      scene.fog instanceof FogExp2 ? scene.fog : (scene.fog = new FogExp2(0xffffff, 0.01));
    fog.color.copy(linear(mood.fog.color));
    fog.density = mood.fog.density * weather.fog;
    poolUniforms.uCloudStrength.value =
      keyIntensity > 0 ? Math.min(0.7, mood.sky.clouds * 0.4 * weather.clouds) : 0;
    poolUniforms.uWind.value = wind;
    shadowUniforms.uLightDir.value.set(...direction).normalize();
    published.current = {
      keyIntensity,
      fogDensity: fog.density,
      particles: mood.particles,
      weather: weatherId,
    };
    const { gl, invalidate } = get();
    gl.shadowMap.needsUpdate = true;
    invalidate();
  });

  useEffect(
    () => () => {
      scene.fog = null;
    },
    [scene],
  );

  // Proxies on layer 1 cast shadows but are never drawn (Engineering.md §7.4).
  const enableProxyLayer = (light: DirectionalLight | null) => {
    light?.shadow.camera.layers.enable(1);
  };

  return (
    <>
      <hemisphereLight
        color={linear(mood.hemi.sky)}
        groundColor={linear(mood.hemi.ground)}
        intensity={mood.hemi.intensity * (0.6 + 0.4 * weather.light)}
      />
      <primitive object={target} position={[center.x, 0, center.z]} />
      {/* Remount when the shadow map size changes: three.js allocates a shadow map only once. */}
      <directionalLight
        key={shadowMapSize}
        ref={enableProxyLayer}
        color={linear(mood.key.color)}
        intensity={keyIntensity}
        position={[
          center.x + direction[0] * distance,
          direction[1] * distance,
          center.z + direction[2] * distance,
        ]}
        target={target}
        castShadow={shadowMapSize > 0 && keyIntensity > 0}
        shadow-mapSize={[shadowMapSize || 512, shadowMapSize || 512]}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-near={1}
        shadow-camera-far={distance * 2}
        shadow-normalBias={0.03}
      />
      <Sky mood={mood} center={center} />
      <Parallax mood={mood} center={center} />
    </>
  );
}
