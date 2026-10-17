import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/**
 * Modal built on the native <dialog>: focus trapping, Esc and the backdrop come from the
 * browser. `open` is controlled by the session store.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  className = '',
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // click on the backdrop
      }}
      className={`m-auto mt-[12vh] max-h-[76vh] w-[min(560px,92vw)] overflow-hidden rounded-panel border-0 bg-felt-900 p-0 text-bone shadow-[0_12px_32px_rgb(0_0_0/0.45)] backdrop:bg-ink/60 ${className}`}
    >
      {open && children}
    </dialog>
  );
}
