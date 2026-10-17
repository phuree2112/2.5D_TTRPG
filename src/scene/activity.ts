// "Something is moving because of the user" (camera, token drag or animation). The quality
// governor only measures frame rate during activity: idle ambient frames are throttled on
// purpose (20–30 Hz) and would otherwise read as a slow device.

let lastActive = -Infinity;

export const markActive = () => {
  lastActive = performance.now();
};

export const isActive = () => performance.now() - lastActive < 300;
