import { useMemo } from 'react';
import { useEnvironment } from '../../app/state/environment';
import { MOODS, moodAt } from '../core/atmosphere';
import type { Mood } from '../core/atmosphere';

/** The current mood: blended from the time of day, or the fixed one the GM picked. */
export function useMood(): Mood {
  const time = useEnvironment((s) => s.timeOfDay);
  const choice = useEnvironment((s) => s.mood);
  return useMemo(() => (choice === 'auto' ? moodAt(time) : MOODS[choice]), [time, choice]);
}
