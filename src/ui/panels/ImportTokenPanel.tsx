import { useEffect, useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent, PointerEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import type { DisplayMode, Faction } from '../../app/state/tokens';
import { cropRect } from '../../tokens/core/rules';
import type { SizeCategory } from '../../tokens/core/rules';
import { ACCEPTED_TYPES, cropToRgba, cropToWebp, decodeImage } from '../../tokens/import';
import { putTokenImage } from '../../tokens/images';
import { focusRing } from '../controls';
import { placeToken } from './place-token';
import { FactionField, ModeField, NameField, SizeField } from './token-fields';

const PREVIEW = 200;

/** Upload, crop into the circle (zoom + drag or arrow keys), and place (Prompt §4.2). */
export function ImportTokenPanel() {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [name, setName] = useState('New token');
  const [size, setSize] = useState<SizeCategory>('medium');
  const [faction, setFaction] = useState<Faction>('player');
  const [mode, setMode] = useState<DisplayMode>('standee');
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<string | null>(null);

  const load = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setAdded(null);
    try {
      const image = await decodeImage(file);
      setBitmap(image);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setName(file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'New token');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Couldn't read this image. Use a PNG, WebP or JPEG.",
      );
    }
  };

  const add = async () => {
    if (!bitmap) return;
    setBusy(true);
    const crop = cropRect(bitmap.width, bitmap.height, zoom, offset);
    const id = `upload:${crypto.randomUUID()}`;
    const webp = (await cropToWebp(bitmap, crop)) ?? undefined;
    putTokenImage(id, { rgba: cropToRgba(bitmap, crop), ...(webp ? { webp } : {}) });
    placeToken({
      name,
      imageId: id,
      displayMode: mode,
      size,
      faction,
      hp: { current: 10, max: 10, temp: 0 },
      hidden: false,
    });
    setBusy(false);
    setAdded(name);
  };

  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    void load(e.dataTransfer.files[0]);
  };

  return (
    <div className="flex flex-col gap-5" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <label
        className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-panel border-2 border-dashed border-line bg-felt-800/60 p-4 text-center text-sm text-bone has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-lantern`}
      >
        <ImagePlus aria-hidden="true" size={24} className="text-pewter" />
        <span>{bitmap ? 'Choose a different image' : 'Choose an image or drop it here'}</span>
        <span className="text-xs text-pewter">
          PNG, WebP or JPEG. Transparent PNGs work best for Pop-out.
        </span>
        <input
          type="file"
          name="token-image"
          accept={ACCEPTED_TYPES.join(',')}
          className="sr-only"
          onChange={(e) => void load(e.target.files?.[0])}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-ember">
          {error}
        </p>
      )}
      {bitmap && (
        <>
          <CropPreview bitmap={bitmap} zoom={zoom} offset={offset} onOffset={setOffset} />
          <label className="flex flex-col gap-1">
            <span className="flex justify-between text-sm">
              <span className="text-bone">Zoom</span>
              <span className="text-pewter tabular-nums">{zoom.toFixed(1)}×</span>
            </span>
            <input
              type="range"
              name="token-zoom"
              min={1}
              max={4}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className={`h-11 w-full cursor-pointer accent-lantern ${focusRing}`}
            />
          </label>
          <NameField value={name} onChange={setName} />
          <ModeField value={mode} onChange={setMode} />
          <SizeField value={size} onChange={setSize} />
          <FactionField value={faction} onChange={setFaction} />
          <button
            type="button"
            disabled={busy}
            onClick={() => void add()}
            className={`min-h-12 rounded-button bg-lantern px-4 text-base font-semibold text-ink transition-[background-color] hover:bg-[#f7c25e] disabled:opacity-60 ${focusRing}`}
          >
            {busy ? 'Adding…' : 'Add to table'}
          </button>
          <p aria-live="polite" className="text-sm text-moss">
            {added ? `Added ${added} at the centre of the view.` : ''}
          </p>
        </>
      )}
    </div>
  );
}

/** Circular crop preview: drag or use arrow keys to position, matching cropRect exactly. */
function CropPreview({
  bitmap,
  zoom,
  offset,
  onOffset,
}: {
  bitmap: ImageBitmap;
  zoom: number;
  offset: { x: number; y: number };
  onOffset: (o: { x: number; y: number }) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; start: { x: number; y: number } } | null>(null);
  const crop = cropRect(bitmap.width, bitmap.height, zoom, offset);
  const sourcePerPixel = crop.size / PREVIEW;

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, PREVIEW, PREVIEW);
    ctx.save();
    ctx.beginPath();
    ctx.arc(PREVIEW / 2, PREVIEW / 2, PREVIEW / 2 - 6, 0, Math.PI * 2);
    ctx.fillStyle = '#d8d0bf';
    ctx.fill();
    ctx.clip();
    ctx.imageSmoothingEnabled = crop.size > PREVIEW;
    ctx.drawImage(bitmap, crop.x, crop.y, crop.size, crop.size, 0, 0, PREVIEW, PREVIEW);
    ctx.restore();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#56b4e9';
    ctx.beginPath();
    ctx.arc(PREVIEW / 2, PREVIEW / 2, PREVIEW / 2 - 6, 0, Math.PI * 2);
    ctx.stroke();
  }, [bitmap, crop.x, crop.y, crop.size]);

  // Keep the offset inside the image so dragging past an edge does not build up.
  const clampOffset = (o: { x: number; y: number }) => {
    const c = cropRect(bitmap.width, bitmap.height, zoom, o);
    return { x: c.x + c.size / 2 - bitmap.width / 2, y: c.y + c.size / 2 - bitmap.height / 2 };
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, start: offset };
  };
  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    onOffset(
      clampOffset({
        x: d.start.x - (e.clientX - d.x) * sourcePerPixel,
        y: d.start.y - (e.clientY - d.y) * sourcePerPixel,
      }),
    );
  };
  const onKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const step = 8 * sourcePerPixel;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    onOffset(clampOffset({ x: offset.x + m[0], y: offset.y + m[1] }));
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvas}
        width={PREVIEW}
        height={PREVIEW}
        tabIndex={0}
        role="img"
        aria-label="Crop preview. Drag or use the arrow keys to move the image inside the circle."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={onKeyDown}
        className={`cursor-grab touch-none rounded-full active:cursor-grabbing ${focusRing}`}
      />
      <p className="text-xs text-pewter">Drag or use the arrow keys to position the image.</p>
    </div>
  );
}
