/** Photo handlers (PRD §7 — fan photos). */
import type { Container } from "../container.js";
import { PhotoService } from "../services/photos.js";
import {
  ApiError,
  type ApiRequest,
  type ApiResponse,
  bodyField,
  created,
  ok,
  requireField,
  requireUser,
} from "../http/types.js";

/** POST /venues/:id/photos { dataUrl, caption? } */
export const uploadPhoto =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const user = requireUser(req);
    const svc = new PhotoService(c.store);
    try {
      const photo = await svc.upload({
        venueId: req.params.id ?? "",
        user,
        dataUrl: requireField<string>(req, "dataUrl"),
        caption: bodyField<string>(req, "caption"),
      });
      return created(photo);
    } catch (err) {
      throw new ApiError(400, err instanceof Error ? err.message : "Invalid photo");
    }
  };

/** GET /venues/:id/photos */
export const listPhotos =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const svc = new PhotoService(c.store);
    const photos = await svc.listForVenue(req.params.id ?? "");
    return ok({ count: photos.length, photos });
  };
