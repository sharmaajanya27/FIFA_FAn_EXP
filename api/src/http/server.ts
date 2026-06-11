/**
 * Local HTTP dev server. Maps routes to the transport-agnostic handlers so the
 * API can be exercised with curl/browser during development. In production the
 * same handlers sit behind API Gateway → Lambda (this file is the only piece
 * that gets swapped for the cloud adapter).
 */
import { createServer, type IncomingMessage } from "node:http";
import { loadApiEnv } from "../config/env.js";
import { buildContainer, type Container } from "../container.js";
import { FileRepository } from "../data/repository.js";
import {
  listCities,
  matches,
  nearbyEvents,
  nearbyVenues,
  recommendations,
  venueById,
} from "../handlers/index.js";
import { login, me, register } from "../handlers/auth.js";
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
      if (size > 12 * 1024 * 1024) reject(new ApiError(413, "Payload too large"));
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
    route("GET", "/venues/nearby", nearbyVenues(c)),
    route("GET", "/venues/:id", venueById(c)),
    route("GET", "/matches", matches(c)),
    route("GET", "/events/nearby", nearbyEvents(c)),
    route("GET", "/recommendations", recommendations(c)),
    // Auth
    route("POST", "/auth/register", register(c)),
    route("POST", "/auth/login", login(c)),
    route("GET", "/me", me()),
  ];
}

async function main(): Promise<void> {
  const env = loadApiEnv();
  const repo = new FileRepository(env.dataDir);
  const c = buildContainer(env, repo);
  const routes = buildRoutes(c);

  const server = createServer(async (req, res) => {
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", "http://localhost");
    const segments = url.pathname.split("/").filter(Boolean);
    const query = Object.fromEntries(url.searchParams.entries());

    const send = (status: number, body: unknown) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
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
