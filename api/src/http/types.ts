/**
 * Transport-agnostic request/response shapes. Handlers depend on these, not on
 * Node's http or API Gateway types, so the same handler runs behind the local
 * dev server today and behind an API Gateway → Lambda adapter later.
 */
export interface ApiRequest {
  query: Record<string, string>;
  params: Record<string, string>;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

export type Handler = (req: ApiRequest) => Promise<ApiResponse>;

export function ok(body: unknown): ApiResponse {
  return { status: 200, body };
}
export function badRequest(message: string): ApiResponse {
  return { status: 400, body: { error: message } };
}
export function notFound(message: string): ApiResponse {
  return { status: 404, body: { error: message } };
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

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
