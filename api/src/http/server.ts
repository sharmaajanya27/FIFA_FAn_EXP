/**
 * Local HTTP dev server. Maps routes to the transport-agnostic handlers so the
 * API can be exercised with curl/browser during development. In production the
 * same handlers sit behind API Gateway → Lambda (this file is the only piece
 * that gets swapped for the cloud adapter).
 */
import { createServer, type IncomingMessage } from "node:http";
import { loadApiEnv } from "../config/env.js";
import { buildContainer, type Container } from "../container.js";
import { FileRepository, type Repository } from "../data/repository.js";
import { PgRepository } from "../data/pgRepository.js";
import { closeSql, getSql } from "../data/db.js";
import { JsonStore, type Store } from "../store/jsonStore.js";
import { PgStore } from "../store/pgStore.js";
import {
  listCities,
  matches,
  nearbyEvents,
  nearbyVenues,
  recommendations,
  venueById,
} from "../handlers/index.js";
import { login, me, register } from "../handlers/auth.js";
import { getProfile, updateProfile } from "../handlers/profiles.js";
import { createReview, listReviews } from "../handlers/reviews.js";
import {
  createCheckIn,
  listUserCheckIns,
  listVenueCheckIns,
} from "../handlers/checkins.js";
import {
  createPrediction,
  leaderboard,
  listMatchPredictions,
  listMyPredictions,
} from "../handlers/predictions.js";
import { createPost, listFeed, toggleLike } from "../handlers/communities.js";
import { estimateCrowd, getCrowd, reportCrowd } from "../handlers/crowd.js";
import { listPhotos, uploadPhoto } from "../handlers/photos.js";
import { aiRecommendations } from "../handlers/ai.js";
import { createEvent, listEvents } from "../handlers/events.js";
import {
  claimVenue,
  featureVenue,
  getListing,
} from "../handlers/sponsorship.js";
import {
  adminBusinessSummary,
  createListing,
  listMyListings,
} from "../handlers/business.js";
import { geocode } from "../handlers/geocode.js";
import { listMetros } from "../handlers/metros.js";
import { listLiveEvents } from "../handlers/liveEvents.js";
import { analyticsSummary, recordPageView } from "../handlers/analytics.js";
import { ApiError, type ApiRequest, type Handler } from "./types.js";
import { log } from "../util/logger.js";

interface Route {
  method: string;
  segments: string[];
  handler: Handler;
}

function route(method: string, path: string, handler: Handler): Route {
  return { method, segments: path.split("/").filter(Boolean), handler };
}

function match(
  route: Route,
  method: string,
  segments: string[],
): Record<string, string> | null {
  if (route.method !== method || route.segments.length !== segments.length) {
    return null;
  }
  const params: Record<string, string> = {};
  for (let i = 0; i < route.segments.length; i++) {
    const r = route.segments[i]!;
    const s = segments[i]!;
    if (r.startsWith(":")) params[r.slice(1)] = decodeURIComponent(s);
    else if (r !== s) return null;
  }
  return params;
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      // 12 MB cap (room for a base64 photo upload in dev).
      if (size > 12 * 1024 * 1024)
        reject(new ApiError(413, "Payload too large"));
      else chunks.push(c);
    });
    req.on("end", () => {
      if (chunks.length === 0) return resolve(undefined);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new ApiError(400, "Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

/** All routes. Feature route groups are assembled here. */
function buildRoutes(c: Container): Route[] {
  return [
    route("GET", "/health", async () => ({ status: 200, body: { ok: true } })),
    route("GET", "/cities", listCities(c)),
    route("GET", "/metros", listMetros(c)),
    route("GET", "/geocode", geocode(c)),
    route("GET", "/venues/nearby", nearbyVenues(c)),
    route("GET", "/venues/:id", venueById(c)),
    route("GET", "/matches", matches(c)),
    route("GET", "/events/nearby", nearbyEvents(c)),
    // Event creation (Phase 3)
    route("POST", "/events", createEvent(c)),
    route("GET", "/events", listEvents(c)),
    route("GET", "/recommendations", recommendations(c)),
    // AI recommendations (Phase 3)
    route("GET", "/ai/recommendations", aiRecommendations(c)),
    // Auth
    route("POST", "/auth/register", register(c)),
    route("POST", "/auth/login", login(c)),
    route("GET", "/me", me()),
    // Profiles
    route("GET", "/users/:id", getProfile(c)),
    route("PUT", "/me/profile", updateProfile(c)),
    // Reviews
    route("POST", "/venues/:id/reviews", createReview(c)),
    route("GET", "/venues/:id/reviews", listReviews(c)),
    // Check-ins
    route("POST", "/venues/:id/checkins", createCheckIn(c)),
    route("GET", "/venues/:id/checkins", listVenueCheckIns(c)),
    route("GET", "/users/:id/checkins", listUserCheckIns(c)),
    // Predictions
    route("GET", "/predictions/leaderboard", leaderboard(c)),
    route("POST", "/matches/:id/predictions", createPrediction(c)),
    route("GET", "/matches/:id/predictions", listMatchPredictions(c)),
    route("GET", "/me/predictions", listMyPredictions(c)),
    // Communities
    route("POST", "/communities/:team/posts", createPost(c)),
    route("GET", "/communities/:team/posts", listFeed(c)),
    route("POST", "/posts/:id/like", toggleLike(c)),
    // Live crowd levels
    route("POST", "/venues/:id/crowd", reportCrowd(c)),
    route("GET", "/venues/:id/crowd", getCrowd(c)),
    route("GET", "/venues/:id/crowd/estimate", estimateCrowd(c)),
    // Fan photos
    route("POST", "/venues/:id/photos", uploadPhoto(c)),
    route("GET", "/venues/:id/photos", listPhotos(c)),
    // Sponsorship marketplace (Phase 3 / §8)
    route("POST", "/venues/:id/claim", claimVenue(c)),
    route("POST", "/venues/:id/feature", featureVenue(c)),
    route("GET", "/venues/:id/listing", getListing(c)),
    // Business accounts: venue listings + admin review (§8)
    route("POST", "/business/listings", createListing(c)),
    route("GET", "/business/listings/mine", listMyListings(c)),
    route("GET", "/admin/business", adminBusinessSummary(c)),
    // Traffic analytics (public beacon + admin summary)
    route("POST", "/analytics/pageview", recordPageView(c)),
    route("GET", "/analytics/summary", analyticsSummary(c)),
    // Live sporting events ticker (public, ESPN-backed)
    route("GET", "/live/events", listLiveEvents(c)),
  ];
}

async function main(): Promise<void> {
  // Load .env (DATABASE_URL, ADMIN_EMAILS, …). Built-in, no dependency.
  try {
    process.loadEnvFile();
  } catch {
    // No .env file — rely on the process environment.
  }
  const env = loadApiEnv();

  // Storage swap (ARCHITECTURE §2): DATABASE_URL → Postgres, else local files.
  let repo: Repository;
  let store: Store;
  if (env.databaseUrl) {
    const sql = getSql(env.databaseUrl);
    repo = new PgRepository(sql);
    store = new PgStore(sql);
    log.info("api: data layer = postgres");
  } else {
    repo = new FileRepository(env.dataDir);
    store = new JsonStore(env.dataDir);
    log.info("api: data layer = files", { dataDir: env.dataDir });
  }

  const c = buildContainer(env, repo, store);
  const routes = buildRoutes(c);

  // CORS: in production restrict to configured origins; in dev allow all.
  const corsOrigin = (reqOrigin: string | undefined): string => {
    if (env.allowedOrigins.length === 0) return "*";
    if (reqOrigin && env.allowedOrigins.includes(reqOrigin)) return reqOrigin;
    return env.allowedOrigins[0]!;
  };

  const server = createServer(async (req, res) => {
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", "http://localhost");
    const segments = url.pathname.split("/").filter(Boolean);
    const query = Object.fromEntries(url.searchParams.entries());
    const origin = req.headers.origin;

    const send = (status: number, body: unknown) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": corsOrigin(origin),
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(body === undefined ? "" : JSON.stringify(body));
    };

    if (method === "OPTIONS") return send(204, undefined);

    try {
      const body =
        method === "POST" || method === "PUT" ? await readBody(req) : undefined;
      const user = await c.auth.resolveUser(
        req.headers.authorization ?? undefined,
      );

      for (const r of routes) {
        const params = match(r, method, segments);
        if (params) {
          const apiReq: ApiRequest = { method, query, params, body, user };
          const result = await r.handler(apiReq);
          return send(result.status, result.body);
        }
      }
      send(404, { error: `No route for ${method} ${url.pathname}` });
    } catch (err) {
      if (err instanceof ApiError)
        return send(err.status, { error: err.message });
      log.error("server: unhandled error", {
        error: err instanceof Error ? err.message : String(err),
      });
      send(500, { error: "Internal server error" });
    }
  });

  server.listen(env.port, () => {
    log.info("api: listening", { port: env.port, env: env.isProduction ? "production" : "development" });
  });

  // Graceful shutdown (PM2 sends SIGINT on restart).
  const shutdown = async () => {
    log.info("api: shutting down...");
    server.close();
    await closeSql();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  log.error("api: fatal", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exitCode = 1;
});
