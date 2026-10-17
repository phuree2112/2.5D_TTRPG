// Bridge between DOM UI (buttons, shortcuts) and the camera inside the lazy scene chunk.
// No three.js imports here, so the UI can use it without pulling three into the main bundle.

export type CameraDriver = {
  rotateStep: (direction: 1 | -1) => void;
  snap45: () => void;
  reset: () => void;
  zoomStep: (direction: 1 | -1) => void;
  tiltStep: (direction: 1 | -1) => void;
};

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
};
