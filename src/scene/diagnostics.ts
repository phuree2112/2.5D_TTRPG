import type { WebGLRenderer } from 'three';
import type {} from './diagnostics-global';

export function publishDiagnostics(gl: WebGLRenderer): void {
  window.__DIORAMA_DIAGNOSTICS__ = {
    ready: true,
    webgl2: gl.capabilities.isWebGL2,
    renderer: gl.info,
  };
}
