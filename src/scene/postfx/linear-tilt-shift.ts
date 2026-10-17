import { TiltShiftEffect } from 'postprocessing';
import { LinearSRGBColorSpace, UnsignedByteType } from 'three';
import type { Texture, WebGLRenderer } from 'three';

// Two fixes over postprocessing 6.39's TiltShiftEffect (Engineering.md §7.5):
// 1. It tags its blur target as sRGB whenever the canvas outputs sRGB, even with HalfFloat
//    frame buffers (KawaseBlurPass checks the buffer type; TiltShiftEffect does not). The blur
//    is then sRGB-encoded but read back as linear, which lifts and washes out the image.
// 2. It switches from the full-resolution image to the half-resolution blur with a hard step at
//    the edge of the sharp band, which shows as a seam across pixel art. Here the switch is a
//    short smooth ramp; the blur itself is still zero at the band edge and feathers outward.

/** Width of the ramp beyond the sharp band, in the effect's units (2 = full screen height). */
const SEAM_RAMP = 0.12;

const FRAGMENT = /* glsl */ `
#ifdef FRAMEBUFFER_PRECISION_HIGH
uniform mediump sampler2D map;
#else
uniform lowp sampler2D map;
#endif
uniform vec2 maskParams;
varying vec2 vUv2;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float outside = max(maskParams.x - vUv2.y, vUv2.y - maskParams.y);
  outputColor = mix(inputColor, texture2D(map, uv), smoothstep(0.0, ${SEAM_RAMP.toFixed(3)}, outside));
}
`;

export class LinearTiltShiftEffect extends TiltShiftEffect {
  constructor(options?: ConstructorParameters<typeof TiltShiftEffect>[0]) {
    super(options);
    this.setFragmentShader(FRAGMENT);
  }

  override initialize(renderer: WebGLRenderer, alpha: boolean, frameBufferType: number): void {
    super.initialize(renderer, alpha, frameBufferType);
    const map = this.uniforms.get('map')?.value as Texture | undefined;
    if (map && frameBufferType !== undefined && frameBufferType !== UnsignedByteType) {
      map.colorSpace = LinearSRGBColorSpace;
    }
  }
}
