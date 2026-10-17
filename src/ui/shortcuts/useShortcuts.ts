import { useEffect } from 'react';
import { isEditableTarget } from '../../app/dom';
import { useSession } from '../../app/state/session';
import { useSettings } from '../../app/state/settings';
import { cameraActions } from '../../scene/camera-actions';
import { focusToolButton } from '../tool-rail/focus';
import { toolsForRole } from '../tool-rail/core/tools';
import { TOOLS } from '../tool-rail/registry';

/** Global keyboard shortcuts (Prompt §14.1). Reads stores directly: no re-render per key. */
export function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const session = useSession.getState();
      const settings = useSettings.getState();
      const open = session.openPanel;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        session.setOpenPanel(open?.kind === 'palette' ? null : { kind: 'palette' });
        return;
      }

      if (event.key === 'Escape') {
        if (open?.kind === 'tool' || open?.kind === 'all-tools') {
          session.closePanel();
          if (open.kind === 'tool') focusToolButton(open.toolId);
        }
        return;
      }

      if (isEditableTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
      // Everything below is a character key: off when single-key shortcuts are off (WCAG 2.1.4).
      if (!settings.singleKeyShortcuts) return;

      if (event.key === '?') {
        event.preventDefault();
        session.setOpenPanel({ kind: 'help' });
        return;
      }

      const key = event.key.toLowerCase();
      if (!event.shiftKey && (key === 'q' || key === 'e')) {
        cameraActions.rotateStep(key === 'q' ? -1 : 1);
        return;
      }

      const role = settings.viewAsPlayer ? 'player' : 'gm';
      const tool = toolsForRole(TOOLS, role).find(
        (t) => t.shortcut.key === key && Boolean(t.shortcut.shift) === event.shiftKey,
      );
      if (tool) {
        event.preventDefault();
        session.openTool(tool.id);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
