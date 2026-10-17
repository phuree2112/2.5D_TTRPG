import { MeshLambertMaterial } from 'three';
import type { DataArrayTexture } from 'three';

// Lambert material patched into a cylindrical billboard (Engineering.md §7.3). The yaw is
// computed per vertex from the same camera uniform used for projection, so sprites never lag
// or jitter while the camera orbits. Mirrors scene/core/billboard.ts (unit-tested).

export function createBillboardMaterial(sprites: DataArrayTexture): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ color: 0xffffff });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSprites = { value: sprites };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aLayer;
attribute float aEmissive;
varying vec2 vSpriteUv;
varying float vLayer;
varying float vEmissive;
float spriteYaw() {
  vec3 center = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec2 toCamera = cameraPosition.xz - center.xz;
  return atan(toCamera.x, toCamera.y);
}`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `float yaw = spriteYaw();
// One normal per sprite, facing the camera and tilted about 72 degrees up, so a sprite takes
// the light of the ground it stands on even when the sun is behind it.
vec3 objectNormal = normalize(vec3(sin(yaw) * 0.3, 0.954, cos(yaw) * 0.3));`,
      )
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = vec3(position.x * cos(yaw), position.y, -position.x * sin(yaw));
vSpriteUv = uv;
vLayer = aLayer;
vEmissive = aEmissive;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform highp sampler2DArray uSprites;
varying vec2 vSpriteUv;
varying float vLayer;
varying float vEmissive;`,
      )
      .replace(
        '#include <map_fragment>',
        `vec4 spriteTexel = texture(uSprites, vec3(vSpriteUv, vLayer));
if (spriteTexel.a < 0.5) discard;
diffuseColor *= spriteTexel;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
totalEmissiveRadiance += spriteTexel.rgb * vEmissive;`,
      );
  };
  material.customProgramCacheKey = () => 'billboard-sprite-v1';
  return material;
}
