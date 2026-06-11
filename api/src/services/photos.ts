/**
 * Fan photos (PRD §7). Stores photos as data URLs in the dev write store; the
 * same service surface backs S3 object storage in production (upload returns a
 * URL either way).
 */
import type { Photo, User } from "../domain/engagement.js";
import type { Store } from "../store/jsonStore.js";

const DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif);base64,/i;

export class PhotoService {
  constructor(private readonly store: Store) {}
  private get photos() {
    return this.store.collection<Photo>("photos");
  }

  async upload(input: {
    venueId: string;
    user: User;
    dataUrl: string;
    caption?: string;
  }): Promise<Photo> {
    if (!DATA_URL_RE.test(input.dataUrl)) {
      throw new Error("dataUrl must be a base64 image data URL (png/jpg/webp/gif)");
    }
    return this.photos.insert({
      venueId: input.venueId,
      userId: input.user.id,
      userName: input.user.displayName,
      dataUrl: input.dataUrl,
      caption: input.caption?.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
  }

  async listForVenue(venueId: string): Promise<Photo[]> {
    return (await this.photos.find((p) => p.venueId === venueId)).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
}
