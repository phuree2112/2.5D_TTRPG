// A pointer claimed by a tool (for example a token drag) is ignored by the camera gestures.
// Tools claim pointers in the capture phase, so they run before the gesture listeners.

const claimed = new Set<number>();

export const claimPointer = (pointerId: number) => void claimed.add(pointerId);
export const releasePointer = (pointerId: number) => void claimed.delete(pointerId);
export const isPointerClaimed = (pointerId: number) => claimed.has(pointerId);
