import { useSettings } from '../../app/state/settings';
import { useTokens } from '../../app/state/tokens';
import type { NewToken } from '../../app/state/tokens';
import { cameraActions } from '../../scene/camera-actions';
import { snapCell } from '../../tokens/core/rules';

/** Add a token at the camera's focus point, snapped to the grid. */
export function placeToken(token: Omit<NewToken, 'cell'>): string {
  const { target } = cameraActions.getView();
  const cell = snapCell(useSettings.getState().grid, target, token.size);
  return useTokens.getState().addToken({ ...token, cell });
}
