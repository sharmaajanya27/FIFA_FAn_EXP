/**
 * Local HTTP dev server. Maps routes to the transport-agnostic handlers so the
 * API can be exercised with curl/browser during development. In production the
 * same handlers sit behind API Gateway → Lambda (this file is the only piece
 * that gets swapped for the cloud adapter).
 */
import { createServer } from "node:http";
import { loadApiEnv } from "../config/env.js";
import { FileRepository } from "../data/repository.js";
import {
  buildContainer,
  listCities,
  matches,
  nearbyEvents,
  nearbyVenues,
  recommendations,
  venueById,
} from "../handlers/index.js";
import { ApiError, type Handler } from "./types.js";
import { log } from "../util/logger.js";

interface Route {
  method: string;
  /** Path segments; ":name" marks a path param. */
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

async function main(): Promise<void> {
  const env = loadApiEnv();
  const repo = new FileRepository(env.dataDir);
  const c = buildContainer(env, repo);

  // Order matters: more specific routes before param routes.
  const routes: Route[] = [
    route("GET", "/health", async () => ({ status: 200, body: { ok: true } })),
    route("GET", "/cities", listCities(c)),
    route("GET", "/venues/nearby", nearbyVenues(c)),
    route("GET", "/venues/:id", venueById(c)),
    route("GET", "/matches", matches(c)),
    route("GET", "/events/nearby", nearbyEvents(c)),
    route("GET", "/recommendations", recommendations(c)),
  ];

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const segments = url.pathname.split("/").filter(Boolean);
    const query = Object.fromEntries(url.searchParams.entries());
    const send = (status: number, body: unknown) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(body));
    };

    try {
      for (const r of routes) {
        const params = match(r, req.method ?? "GET", segments);
        if (params) {
          const result = await r.handler({ query, params });
          return send(result.status, result.body);
        }
      }
      send(404, { error: `No route for ${req.method} ${url.pathname}` });
    } catch (err) {
      if (err instanceof ApiError) return send(err.status, { error: err.message });
      log.error("server: unhandled error", {
        error: err instanceof Error ? err.message : String(err),
      });
      send(500, { error: "Internal server error" });
    }
  });

  server.listen(env.port, () => {
    log.info("api: listening", { port: env.port, dataDir: env.dataDir });
  });
}

main().catch((err) => {
  log.error("api: fatal", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exitCode = 1;
});
