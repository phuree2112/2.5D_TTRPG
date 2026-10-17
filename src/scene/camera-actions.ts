// Bridge between DOM UI (buttons, shortcuts) and the camera inside the lazy scene chunk.
// No three.js imports here, so the UI can use it without pulling three into the main bundle.

export type CameraDriver = {
  rotateStep: (direction: 1 | -1) => void;
  snap45: () => void;
  reset: () => void;
  zoomStep: (direction: 1 | -1) => void;
  tiltStep: (direction: 1 | -1) => void;
  /** Current azimuth and focus point (where new tokens are placed). */
  getView: () => CameraView;
};

export type CameraView = { azimuth: number; target: { x: number; z: number } };

let driver: CameraDriver | null = null;

export function setCameraDriver(next: CameraDriver): () => void {
  driver = next;
  return () => {
    if (driver === next) driver = null;
  };
}

export const cameraActions: CameraDriver = {
  rotateStep: (direction) => driver?.rotateStep(direction),
  snap45: () => driver?.snap45(),
  reset: () => driver?.reset(),
  zoomStep: (direction) => driver?.zoomStep(direction),
  tiltStep: (direction) => driver?.tiltStep(direction),
  getView: () => driver?.getView() ?? { azimuth: Math.PI / 4, target: { x: 15, z: 15 } },
};
