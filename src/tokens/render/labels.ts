import { ShaderMaterial, Vector2 } from 'three';
import type { DataArrayTexture } from 'three';
import type { Token } from '../../app/state/tokens';
import { hpStatus } from '../core/rules';
import { labelName } from '../core/labels';
import type { HpView } from '../core/labels';

// Name and HP labels (Prompt §4.3: WebGL sprites, no per-token HTML; Visual.md §3.5).
// Canvas 2D draws them, because the browser's text shaper places Thai vowels and tone marks
// correctly. Drawn at 2× and shown at a constant 128 × 48 CSS pixels.

export const LABEL_SIZE = { width: 256, height: 96 };

const FONT = '"IBM Plex Sans", "IBM Plex Sans Thai", "Noto Sans Thai", system-ui, sans-serif';
const COLORS = {
  pill: 'rgba(21, 34, 42, 0.86)',
  bone: '#eee8dc',
  pewter: '#9fb0b9',
  ink: 'rgba(11, 18, 22, 0.85)',
  healthy: '#4fc08d',
  bloodied: '#f0e442',
  critical: '#d55e00',
  temp: '#56b4e9',
};
const WORDS = { healthy: 'Healthy', bloodied: 'Bloodied', critical: 'Bloodied', down: 'Down' };

let canvas: HTMLCanvasElement | null = null;

function context(): CanvasRenderingContext2D {
  canvas ??= Object.assign(document.createElement('canvas'), LABEL_SIZE);
  return canvas.getContext('2d', { willReadFrequently: true })!;
}

function pill(ctx: CanvasRenderingContext2D, text: string, y: number, size: number, color: string) {
  ctx.font = `600 ${size}px ${FONT}`;
  const width = Math.min(ctx.measureText(text).width + 24, LABEL_SIZE.width - 4);
  const x = (LABEL_SIZE.width - width) / 2;
  const h = size + 12;
  ctx.fillStyle = COLORS.pill;
  ctx.beginPath();
  ctx.roundRect(x, y, width, h, h / 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, LABEL_SIZE.width / 2, y + h / 2 + 1, width - 16);
}

function stripes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  gap: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = 'rgba(11, 18, 22, 0.45)';
  ctx.lineWidth = 2;
  for (let i = -h; i < w; i += gap) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
    ctx.stroke();
  }
  ctx.restore();
}

function hpBar(ctx: CanvasRenderingContext2D, token: Token, y: number) {
  const width = 160;
  const height = 12;
  const x = (LABEL_SIZE.width - width) / 2;
  const { current, max, temp } = token.hp;
  const status = hpStatus(token.hp);
  ctx.fillStyle = COLORS.ink;
  ctx.fillRect(x - 2, y - 2, width + 4, height + 4);
  const fill = Math.round((Math.max(0, current) / Math.max(max, 1)) * width);
  if (fill > 0) {
    ctx.fillStyle = COLORS[status === 'down' ? 'critical' : status];
    ctx.fillRect(x, y, fill, height);
    if (status === 'bloodied') stripes(ctx, x, y, fill, height, 8);
    if (status === 'critical') stripes(ctx, x, y, fill, height, 5);
  }
  if (temp > 0) {
    const t = Math.min(width - fill, Math.round((temp / Math.max(max, 1)) * width));
    ctx.fillStyle = COLORS.temp;
    ctx.fillRect(x + fill, y, t, height);
    stripes(ctx, x + fill, y, t, height, 4);
  }
  ctx.fillStyle = COLORS.ink;
  for (const q of [0.25, 0.5, 0.75]) ctx.fillRect(x + Math.round(width * q) - 1, y, 2, height);
}

/** RGBA pixels (top-left origin) for one token label. */
export function drawLabel(token: Token, view: HpView): Uint8ClampedArray {
  const ctx = context();
  ctx.clearRect(0, 0, LABEL_SIZE.width, LABEL_SIZE.height);
  pill(ctx, labelName(token.name), 2, 22, COLORS.bone);

  if (view === 'word') {
    pill(ctx, WORDS[hpStatus(token.hp)], 42, 18, COLORS.pewter);
  } else if (view === 'bar' || view === 'numbers') {
    hpBar(ctx, token, 44);
    if (view === 'numbers') {
      const { current, max, temp } = token.hp;
      const text = `${current} / ${max}${temp > 0 ? ` (+${temp})` : ''}`;
      ctx.font = `600 20px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 5;
      ctx.strokeStyle = COLORS.ink;
      ctx.strokeText(text, LABEL_SIZE.width / 2, 74);
      ctx.fillStyle = COLORS.bone;
      ctx.fillText(text, LABEL_SIZE.width / 2, 74);
    }
  }
  return ctx.getImageData(0, 0, LABEL_SIZE.width, LABEL_SIZE.height).data;
}

export const labelUniforms = {
  /** World units per CSS pixel at distance 1 (perspective) or per CSS pixel (orthographic). */
  uPixelWorld: { value: 0.001 },
  uOrtho: { value: 0 },
  uLabelSize: { value: new Vector2(LABEL_SIZE.width / 2, LABEL_SIZE.height / 2) },
};

export function createLabelMaterial(source: {
  readonly texture: DataArrayTexture;
}): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      ...labelUniforms,
      uLabels: {
        get value() {
          return source.texture;
        },
      },
    },
    vertexShader: /* glsl */ `
      uniform float uPixelWorld;
      uniform float uOrtho;
      uniform vec2 uLabelSize;
      attribute float aLabel;
      varying vec2 vUv;
      varying float vLayer;
      void main() {
        vUv = uv;
        vLayer = aLabel;
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        // Constant screen size up close; never wider than about 2.4 cells when zoomed out.
        float worldPerPixel = uOrtho > 0.5 ? uPixelWorld : -mv.z * uPixelWorld;
        worldPerPixel = min(worldPerPixel, 2.4 / uLabelSize.x);
        mv.xy += position.xy * uLabelSize * worldPerPixel;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform highp sampler2DArray uLabels;
      varying vec2 vUv;
      varying float vLayer;
      void main() {
        vec4 color = texture(uLabels, vec3(vUv, vLayer));
        if (color.a < 0.02) discard;
        gl_FragColor = color;
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
}
