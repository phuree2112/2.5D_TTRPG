import { useSyncExternalStore } from 'react';
import { Plus } from 'lucide-react';
import { sampleImageId } from '../../app/state/tokens';
import { SAMPLE_TOKENS } from '../../tokens/core/sample-art';
import { listUploads, subscribeTokenImages } from '../../tokens/images';
import { focusRing } from '../controls';
import { placeToken } from './place-token';
import { tokenPreview } from './token-preview';

/** Sample tokens (Prompt §12) and this session's imports, added at the camera focus. */
export function TokenLibraryPanel() {
  const uploads = useSyncExternalStore(subscribeTokenImages, listUploads);

  return (
    <>
      <section aria-label="Samples" className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-bone">Samples</h3>
        <div className="grid grid-cols-4 gap-2">
          {SAMPLE_TOKENS.map((s) => (
            <Tile
              key={s.id}
              name={s.name}
              imageId={sampleImageId(s.id)}
              onAdd={() =>
                placeToken({
                  name: s.name,
                  imageId: sampleImageId(s.id),
                  displayMode: 'standee',
                  size: s.size,
                  faction: s.faction,
                  hp: { current: 10, max: 10, temp: 0 },
                  hidden: false,
                })
              }
            />
          ))}
        </div>
      </section>
      <section aria-label="Imported" className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-bone">Imported this session</h3>
        {uploads.length === 0 ? (
          <p className="text-sm text-pewter">Nothing yet. Use Import token to add your own art.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {uploads.map((id, i) => (
              <Tile
                key={id}
                name={`Upload ${i + 1}`}
                imageId={id}
                onAdd={() =>
                  placeToken({
                    name: `Token ${i + 1}`,
                    imageId: id,
                    displayMode: 'standee',
                    size: 'medium',
                    faction: 'player',
                    hp: { current: 10, max: 10, temp: 0 },
                    hidden: false,
                  })
                }
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Tile({ name, imageId, onAdd }: { name: string; imageId: string; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label={`Add ${name}`}
      className={`group relative flex flex-col items-center gap-1 rounded-button bg-felt-800 p-2 text-xs text-bone transition-[background-color] hover:bg-felt-700 ${focusRing}`}
    >
      <img
        src={tokenPreview(imageId)}
        alt=""
        width={56}
        height={56}
        className="[image-rendering:pixelated]"
      />
      <span className="truncate">{name}</span>
      <Plus aria-hidden="true" size={14} className="absolute top-1 right-1 text-pewter" />
    </button>
  );
}
