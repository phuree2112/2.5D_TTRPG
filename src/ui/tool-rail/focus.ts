// Tool buttons register here so focus can return to the right button when a panel closes.
const buttons = new Map<string, HTMLButtonElement>();

/** Use as a React 19 ref callback: returns the cleanup. */
export function registerToolButton(id: string, element: HTMLButtonElement | null) {
  if (!element) return;
  buttons.set(id, element);
  return () => {
    if (buttons.get(id) === element) buttons.delete(id);
  };
}

export function focusToolButton(id: string) {
  buttons.get(id)?.focus();
}
