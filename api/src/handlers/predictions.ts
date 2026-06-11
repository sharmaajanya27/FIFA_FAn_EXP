/** Prediction handlers (PRD §7 — match predictions). */
import type { Container } from "../container.js";
import { PredictionService } from "../services/predictions.js";
import {
  type ApiRequest,
  type ApiResponse,
  created,
  ok,
  requireField,
  requireUser,
} from "../http/types.js";

/** POST /matches/:id/predictions { homeScore, awayScore } */
export const createPrediction =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const user = requireUser(req);
    const svc = new PredictionService(c.store);
    const prediction = await svc.predict({
      matchId: req.params.id ?? "",
      user,
      homeScore: Number(requireField<number>(req, "homeScore")),
      awayScore: Number(requireField<number>(req, "awayScore")),
    });
    return created(prediction);
  };

/** GET /matches/:id/predictions */
export const listMatchPredictions =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const svc = new PredictionService(c.store);
    const predictions = await svc.listForMatch(req.params.id ?? "");
    return ok({ count: predictions.length, predictions });
  };

/** GET /me/predictions */
export const listMyPredictions =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const user = requireUser(req);
    const svc = new PredictionService(c.store);
    const predictions = await svc.listForUser(user.id);
    return ok({ count: predictions.length, predictions });
  };

/** GET /predictions/leaderboard */
export const leaderboard =
  (c: Container) =>
  async (): Promise<ApiResponse> => {
    const svc = new PredictionService(c.store);
    return ok({ leaderboard: await svc.leaderboard() });
  };
