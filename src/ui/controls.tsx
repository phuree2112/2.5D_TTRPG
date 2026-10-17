import type { ComponentProps, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lantern';

/** Icon-only button with an accessible name and a 48 px touch target (Visual.md §9.2). */
export function IconButton({
  icon: Icon,
  label,
  size = 'md',
  className = '',
  ...props
}: { icon: LucideIcon; label: string; size?: 'md' | 'sm' } & Omit<
  ComponentProps<'button'>,
  'children'
>) {
  // md = 48 px; sm = 44 px, the brief's minimum touch target (Prompt §14.1).
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid place-items-center rounded-button text-bone transition-[background-color,color] hover:bg-felt-700 aria-pressed:bg-lantern aria-pressed:text-ink disabled:opacity-40 ${size === 'md' ? 'size-12' : 'size-11'} ${focusRing} ${className}`}
      {...props}
    >
      <Icon aria-hidden="true" size={20} strokeWidth={1.75} />
    </button>
  );
}

/** A labelled group of mutually exclusive options (native radio buttons). */
export function Segmented<T extends string>({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm text-pewter">{label}</legend>
      <div className="flex flex-wrap gap-1 rounded-button bg-felt-800 p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className="min-h-11 min-w-16 flex-1 cursor-pointer rounded-input px-3 text-center text-sm leading-[44px] text-bone transition-[background-color,color] has-checked:bg-lantern has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-lantern hover:bg-felt-700 has-checked:hover:bg-lantern"
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** On/off setting rendered as a switch (native checkbox with role="switch"). */
export function Switch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start justify-between gap-4">
      <span className="flex flex-col gap-1">
        <span className="text-base text-bone">{label}</span>
        {description && <span className="text-sm text-pewter">{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`relative mt-1 h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full bg-felt-700 transition-[background-color] before:absolute before:top-1 before:left-1 before:size-5 before:rounded-full before:bg-bone before:transition-transform checked:bg-lantern checked:before:translate-x-5 checked:before:bg-ink ${focusRing}`}
      />
    </label>
  );
}
