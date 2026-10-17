import {
  DataArrayTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NearestFilter,
  SRGBColorSpace,
} from 'three';

/**
 * A texture array whose layers are assigned to ids on demand (Engineering.md §7.3, D14).
 * Uploads one layer at a time (`addLayerUpdate`). Doubles its capacity when full; the
 * `texture` getter always returns the current texture, so shader uniforms read it through
 * a getter.
 */
export class LayeredTexture {
  private current: DataArrayTexture;
  private readonly ids = new Map<string, number>();
  private free: number[] = [];
  private capacity: number;
  private readonly width: number;
  private readonly height: number;
  private readonly pixelArt: boolean;

  constructor(width: number, height: number, capacity: number, pixelArt: boolean) {
    this.width = width;
    this.height = height;
    this.pixelArt = pixelArt;
    this.capacity = capacity;
    this.current = this.create(capacity);
  }

  get texture(): DataArrayTexture {
    return this.current;
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  /** Layer for `id`, uploading `rgba` (top-left origin) the first time or when `force` is set. */
  layer(id: string, rgba: () => ArrayLike<number> | undefined, force = false): number {
    let layer = this.ids.get(id);
    if (layer !== undefined && !force) return layer;
    if (layer === undefined) {
      layer = this.free.pop() ?? this.ids.size;
      if (layer >= this.capacity) this.grow();
      this.ids.set(id, layer);
    }
    const data = rgba();
    if (data) this.upload(layer, data);
    return layer;
  }

  release(id: string): void {
    const layer = this.ids.get(id);
    if (layer === undefined) return;
    this.ids.delete(id);
    this.free.push(layer);
  }

  dispose(): void {
    this.current.dispose();
  }

  private create(depth: number): DataArrayTexture {
    const texture = new DataArrayTexture(
      new Uint8Array(this.width * this.height * 4 * depth),
      this.width,
      this.height,
      depth,
    );
    texture.colorSpace = SRGBColorSpace;
    // Pixel art stays crisp up close; text (labels) is smoothed.
    texture.magFilter = this.pixelArt ? NearestFilter : LinearFilter;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
  }

  private upload(layer: number, rgba: ArrayLike<number>): void {
    const { width, height } = this;
    const target = this.current.image.data as Uint8Array;
    const offset = layer * width * height * 4;
    // WebGL row 0 is the bottom of the texture: copy rows bottom-up.
    for (let y = 0; y < height; y++) {
      const src = y * width * 4;
      const dst = offset + (height - 1 - y) * width * 4;
      for (let i = 0; i < width * 4; i++) target[dst + i] = rgba[src + i]!;
    }
    this.current.addLayerUpdate(layer);
    this.current.needsUpdate = true;
  }

  private grow(): void {
    const next = this.create(this.capacity * 2);
    (next.image.data as Uint8Array).set(this.current.image.data as Uint8Array);
    this.current.dispose();
    this.current = next;
    this.capacity *= 2;
  }
}
