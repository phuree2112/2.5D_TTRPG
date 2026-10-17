import type { Role } from '../../ui/tool-rail/core/tools';
import { useSettings } from './settings';

/** Local demo: you are the GM, with an option to preview the player's view. */
export function useRole(): Role {
  return useSettings((s) => (s.viewAsPlayer ? 'player' : 'gm'));
}
