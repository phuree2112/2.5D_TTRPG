import { MeshDepthMaterial, MeshLambertMaterial, RGBADepthPacking } from 'three';
import type { DataArrayTexture, IUniform } from 'three';
import { withLightPool } from '../../scene/lighting/light-pool';
import { shadowUniforms } from '../../scene/sprites/billboard-material';

// One Lambert material draws every token face and ring base (Engineering.md §7.3, Visual.md §3):
//   aMode 0 Flat     lies on the floor; the image's top points away from the camera
//   aMode 1 Standee  upright disc turned toward the camera (cylindrical billboard) on a base
//   aMode 2 Pop-out  like Standee; the character may break out of the top half of the frame
//   aMode 3 Base     the flat ring under a Standee or Pop-out
// Quad coordinates are in "circle units": the token circle spans 0..1 in x and y.

export type TokenTextureSource = { readonly texture: DataArrayTexture };

export const tokenTime: IUniform<number> = { value: 0 };

const COMMON_VERTEX = /* glsl */ `
attribute float aLayer;
attribute float aMode;
attribute vec4 aRing;
attribute vec4 aFlags;
attribute vec3 aBackdrop;
varying vec2 vLocal;
varying float vLayer;
varying float vMode;
varying vec4 vRing;
varying vec4 vFlags;
varying vec3 vBackdrop;
`;

const NORMAL_VERTEX = /* glsl */ `
vec3 tkCenter = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
float tkScale = length(instanceMatrix[0].xyz);
vec2 tkToCam = cameraPosition.xz - tkCenter.xz;
float tkYaw = atan(tkToCam.x, tkToCam.y);
bool tkUpright = aMode > 0.5 && aMode < 2.5;
// Upright tokens share the sprite normal: camera-facing but tilted about 72 degrees up, so
// they take nearly the same light as the ground they stand on.
vec3 objectNormal = tkUpright
  ? normalize(vec3(sin(tkYaw) * 0.3, 0.954, cos(tkYaw) * 0.3))
  : vec3(0.0, 1.0, 0.0);
`;

const BEGIN_VERTEX = /* glsl */ `
vec2 tkLocal = position.xy + vec2(0.5, 0.0);
tkLocal.y = min(tkLocal.y, (aMode > 1.5 && aMode < 2.5) ? 1.45 : 1.1);
vec3 transformed;
if (tkUpright) {
  vec3 tkRight = vec3(cos(tkYaw), 0.0, -sin(tkYaw));
  transformed = tkRight * (tkLocal.x - 0.5) + vec3(0.0, tkLocal.y + 0.06 / tkScale, 0.0);
} else {
  vec2 tkAway = normalize(-tkToCam + vec2(1e-5));
  vec3 tkForward = vec3(tkAway.x, 0.0, tkAway.y);
  vec3 tkRight = vec3(-tkForward.z, 0.0, tkForward.x);
  float tkLift = (aMode > 2.5 ? 0.012 : 0.02) / tkScale;
  transformed = tkRight * (tkLocal.x - 0.5) + tkForward * (tkLocal.y - 0.5) + vec3(0.0, tkLift, 0.0);
}
vLocal = tkLocal;
vLayer = aLayer;
vMode = aMode;
vRing = aRing;
vFlags = aFlags;
vBackdrop = aBackdrop;
`;

const COMMON_FRAGMENT = /* glsl */ `
uniform highp sampler2DArray uTokens;
uniform float uTokenTime;
varying vec2 vLocal;
varying float vLayer;
varying float vMode;
varying vec4 vRing;
varying vec4 vFlags;
varying vec3 vBackdrop;

float tkBayer(vec2 p) {
  ivec2 q = ivec2(mod(p, 4.0));
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[q.x + q.y * 4]) + 0.5) / 16.0;
}

// Faction ring with a pattern so colour is never the only cue (Visual.md §3.3).
vec3 tkRing(float r, float angle) {
  vec3 ink = vec3(0.0034, 0.0060, 0.0080);
  if (r < 0.885 || r > 0.975) return ink;
  float a = angle / 6.28318 + 0.5;
  float pattern = vRing.w;
  if (pattern > 0.5 && pattern < 1.5) {          // enemy: 12 notches
    if (fract(a * 12.0) < 0.22 && r > 0.925) return ink;
  } else if (pattern > 1.5 && pattern < 2.5) {   // ally: 16 dashes
    if (fract(a * 16.0) < 0.35) return ink;
  } else if (pattern > 2.5 && pattern < 3.5) {   // neutral: double line
    if (r > 0.915 && r < 0.945) return ink;
  } else if (pattern > 3.5) {                     // hidden: dots
    float f = fract(a * 18.0) - 0.5;
    float rr = (r - 0.93) / 0.045;
    if (f * f * 4.0 + rr * rr > 0.6) return ink;
  }
  return vRing.rgb;
}
`;

const MAP_FRAGMENT = /* glsl */ `
vec2 tkP = vLocal - vec2(0.5);
float tkR = length(tkP) * 2.0;
float tkAngle = atan(tkP.y, tkP.x);
bool tkPop = vMode > 1.5 && vMode < 2.5;
vec2 tkUv = tkPop ? (vLocal + vec2(0.125, 0.0)) / 1.25 : vLocal;
vec4 tkTex = (tkUv.x >= 0.0 && tkUv.x <= 1.0 && tkUv.y >= 0.0 && tkUv.y <= 1.0)
  ? texture(uTokens, vec3(tkUv, vLayer))
  : vec4(0.0);
vec3 tkColor;
if (vMode > 2.5) {
  if (tkR > 1.0) discard;
  tkColor = tkR < 0.86 ? vBackdrop * 0.55 : tkRing(tkR, tkAngle);
} else {
  bool tkChar = tkTex.a > 0.5 && (tkR < 0.86 || (tkPop && vLocal.y > 0.5));
  if (tkChar) tkColor = tkTex.rgb;
  else if (tkR < 0.86) tkColor = vBackdrop;
  else if (tkR <= 1.0) tkColor = tkRing(tkR, tkAngle);
  else if (vFlags.x > 0.5 && tkR <= 1.12) tkColor = vec3(0.84, 0.80, 0.71) * (0.8 + 0.2 * sin(uTokenTime * 3.14159));
  else discard;
}
if (vFlags.y > 0.5 && tkBayer(gl_FragCoord.xy) < 0.5) discard;
if (vFlags.z > 0.5) tkColor = mix(tkColor, vec3(dot(tkColor, vec3(0.299, 0.587, 0.114))), 0.8);
if (vFlags.w > 0.5) tkColor *= 1.15;
diffuseColor.rgb *= tkColor;
`;

export function createTokenMaterial(source: TokenTextureSource): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ color: 0xffffff });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTokens = {
      get value() {
        return source.texture;
      },
    };
    shader.uniforms.uTokenTime = tokenTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${COMMON_VERTEX}`)
      .replace('#include <beginnormal_vertex>', NORMAL_VERTEX)
      .replace('#include <begin_vertex>', BEGIN_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${COMMON_FRAGMENT}`)
      .replace('#include <map_fragment>', MAP_FRAGMENT)
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
// Legibility floor: a token far from any light at night is still readable (Visual.md §4.1).
totalEmissiveRadiance += diffuseColor.rgb * 0.05;`,
      );
  };
  material.customProgramCacheKey = () => 'token-face-v2';
  return withLightPool(material);
}

/**
 * Depth material for token shadow proxies: Standee and Pop-out tokens turned toward the key
 * light, so the shadow keeps the token's silhouette from any camera angle (Prompt §5.2).
 * Flat tokens and ring bases lie on the floor and cast nothing.
 */
export function createTokenDepthMaterial(source: TokenTextureSource): MeshDepthMaterial {
  const material = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTokens = {
      get value() {
        return source.texture;
      },
    };
    shader.uniforms.uLightDir = shadowUniforms.uLightDir;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aLayer;
attribute float aMode;
uniform vec3 uLightDir;
varying vec2 vLocal;
varying float vLayer;
varying float vMode;`,
      )
      .replace(
        '#include <begin_vertex>',
        `vec2 tkLocal = position.xy + vec2(0.5, 0.0);
bool tkPop = aMode > 1.5 && aMode < 2.5;
tkLocal.y = min(tkLocal.y, tkPop ? 1.45 : 1.1);
float tkScale = length(instanceMatrix[0].xyz);
float tkLightYaw = atan(uLightDir.x, uLightDir.z);
vec3 tkRight = vec3(cos(tkLightYaw), 0.0, -sin(tkLightYaw));
vec3 transformed = tkRight * (tkLocal.x - 0.5) + vec3(0.0, tkLocal.y + 0.06 / tkScale, 0.0);
if (aMode < 0.5 || aMode > 2.5) transformed = vec3(0.0);
vLocal = tkLocal;
vLayer = aLayer;
vMode = aMode;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform highp sampler2DArray uTokens;
varying vec2 vLocal;
varying float vLayer;
varying float vMode;`,
      )
      .replace(
        'void main() {',
        `void main() {
  float tkR = length(vLocal - vec2(0.5)) * 2.0;
  bool tkPop = vMode > 1.5 && vMode < 2.5;
  vec2 tkUv = tkPop ? (vLocal + vec2(0.125, 0.0)) / 1.25 : vLocal;
  float tkAlpha = (tkUv.x >= 0.0 && tkUv.x <= 1.0 && tkUv.y >= 0.0 && tkUv.y <= 1.0)
    ? texture(uTokens, vec3(tkUv, vLayer)).a : 0.0;
  if (!(tkR <= 1.0 || (tkPop && vLocal.y > 0.5 && tkAlpha > 0.5))) discard;`,
      );
  };
  material.customProgramCacheKey = () => 'token-depth-v1';
  return material;
}
