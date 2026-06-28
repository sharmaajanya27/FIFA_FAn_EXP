/**
 * Transport-agnostic request/response shapes. Handlers depend on these, not on
 * Node's http or API Gateway types, so the same handler runs behind the local
 * dev server today and behind an API Gateway → Lambda adapter later.
 */
import type { User } from "../domain/engagement.js";

export interface ApiRequest {
  method: string;
  query: Record<string, string>;
  params: Record<string, string>;
  /** Parsed JSON body (POST/PUT), or undefined. */
  body?: unknown;
  /** Resolved authenticated user, if a valid bearer token was supplied. */
  user?: User;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

export type Handler = (req: ApiRequest) => Promise<ApiResponse>;

export function ok(body: unknown): ApiResponse {
  return { status: 200, body };
}
export function created(body: unknown): ApiResponse {
  return { status: 201, body };
}
export function badRequest(message: string): ApiResponse {
  return { status: 400, body: { error: message } };
}
export function unauthorized(message = "Authentication required"): ApiResponse {
  return { status: 401, body: { error: message } };
}
export function notFound(message: string): ApiResponse {
  return { status: 404, body: { error: message } };
}
export function forbidden(message = "Forbidden"): ApiResponse {
  return { status: 403, body: { error: message } };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Parse a required float query param, throwing a 400-friendly error. */
export function requireFloat(req: ApiRequest, key: string): number {
  const raw = req.query[key];
  const n = raw === undefined ? NaN : Number(raw);
  if (!Number.isFinite(n)) {
    throw new ApiError(400, `Missing or invalid query param: ${key}`);
  }
  return n;
}

/**
 * Return the authenticated user or throw a 401.
 */
export function requireUser(req: ApiRequest): User {
  if (!req.user) throw new ApiError(401, "Authentication required");
  return req.user;
}

/**
 * Return the authenticated user only if their email is in the admin allowlist
 * (env ADMIN_EMAILS), else throw 401/403. No role field on the user model is
 * needed — the allowlist is the gate for the analytics/admin surface.
 */
export function requireAdmin(req: ApiRequest, adminEmails: string[]): User {
  const user = requireUser(req);
  if (!adminEmails.includes(user.email.toLowerCase())) {
    throw new ApiError(403, "Admin access required");
  }
  return user;
}

/** Read a required field from the JSON body, throwing 400 if absent. */
export function requireField<T>(req: ApiRequest, key: string): T {
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (body[key] === undefined || body[key] === null || body[key] === "") {
    throw new ApiError(400, `Missing body field: ${key}`);
  }
  return body[key] as T;
}

export function bodyField<T>(req: ApiRequest, key: string): T | undefined {
  const body = (req.body ?? {}) as Record<string, unknown>;
  return body[key] as T | undefined;
}

/** Require a body field whose value is one of `allowed`, else throw 400. */
export function requireOneOf<T extends string>(
  req: ApiRequest,
  key: string,
  allowed: readonly T[],
): T {
  const value = requireField<string>(req, key);
  if (!(allowed as readonly string[]).includes(value)) {
    throw new ApiError(400, `Invalid ${key}: ${value}`);
  }
  return value as T;
}

/** Require a body field that is an integer in [min, max], else throw 400. */
export function requireIntInRange(
  req: ApiRequest,
  key: string,
  min: number,
  max: number,
): number {
  const raw = Number(requireField<number>(req, key));
  if (!Number.isFinite(raw) || raw < min || raw > max) {
    throw new ApiError(400, `Invalid ${key}: must be a number ${min}..${max}`);
  }
  return Math.round(raw);
}

/**
 * Read a required anonymous device id from the body or query string. V1 fan
 * engagement is account-free: a device-scoped `anonId` (random, stored in the
 * browser's localStorage) identifies the participant. Not a security boundary —
 * just enough to let one device manage its own RSVP/review.
 */
export function requireAnonId(req: ApiRequest): string {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const fromBody = typeof body.anonId === "string" ? body.anonId.trim() : "";
  const fromQuery = req.query.anonId?.trim() ?? "";
  const id = fromBody || fromQuery;
  if (!id) throw new ApiError(400, "Missing anonId");
  return id;
}
