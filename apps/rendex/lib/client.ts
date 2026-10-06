import type { HookContext } from "@w6w/types";

/**
 * Rendex REST client.
 *
 * Verified 2026-10-06 against https://rendex.dev/docs/api-reference, /docs/watch and
 * /docs/errors (Rendex publishes no OpenAPI document) plus unauthenticated live probes of
 * `api.rendex.dev`.
 *
 * ## One host, one prefix
 *
 * Everything is `https://api.rendex.dev/v1/...`. Only `GET /health` sits outside `/v1`.
 *
 * ## Envelope
 *
 * Success: `{success: true, data: {...}, meta: {requestId, timestamp, usage?}}`.
 * Failure: `{success: false, error: {code, message, details?}, meta: {requestId}}`. The
 * client unwraps `data` and keeps `meta` beside it, so a workflow can read credits spent.
 *
 * ## Binary output
 *
 * `POST /v1/screenshot` answers raw image/PDF bytes. A workflow cannot carry bytes, so the
 * capture actions use the documented `POST /v1/screenshot/json` twin, which returns the same
 * render as a base64 string in `data.image`.
 *
 * ## Error codes differ from the docs
 *
 * The error-codes page lists `INVALID_API_KEY`; the live API answers `INVALID_KEY` (401) for a
 * wrong key and `MISSING_API_KEY` (401) for none. Both spellings are treated as a bad key.
 */
export const API_BASE = "https://api.rendex.dev";
export const API_PREFIX = "/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

interface RendexErrorBody {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ path?: string; message?: string }>;
  };
  meta?: { requestId?: string };
}

/** Drop keys the caller left unset. `false` and `0` survive: both are meaningful. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Path-escape a caller-supplied id. */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim());
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** One actionable line from the vendor's error body, keeping its code and field messages. */
export function formatRendexError(
  status: number,
  method: string,
  path: string,
  raw: string,
  retryAfter?: string | null,
): string {
  let parsed: RendexErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as RendexErrorBody;
  } catch { /* not JSON */ }
  const err = parsed?.error;
  if (!err || typeof err !== "object" || (!err.code && !err.message)) {
    return `Rendex ${status} for ${method} ${path}: ${truncate(raw)}`;
  }
  const fields = (err.details ?? []).map((d) => `${d.path ?? "?"}: ${d.message ?? ""}`).join("; ");
  const hint = err.code === "USAGE_EXCEEDED"
    ? "monthly credit limit reached"
    : status === 429 && retryAfter
    ? `retry after ${retryAfter}s`
    : undefined;
  return truncate(
    [
      `Rendex ${status} ${err.code ?? "error"} for ${method} ${path}`,
      err.message,
      fields || undefined,
      hint,
      parsed?.meta?.requestId ? `request ${parsed.meta.requestId}` : undefined,
    ].filter(Boolean).join(": "),
    1000,
  );
}

/**
 * Unwrap the success envelope. An object `data` is spread with `meta` beside it; an array
 * `data` becomes `{items, meta}`; a body with no envelope is returned as it came.
 */
export function unwrap(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") return { value: body };
  const b = body as { success?: unknown; data?: unknown; meta?: unknown };
  if (b.success !== true || !("data" in b)) return body as Record<string, unknown>;
  const meta = b.meta === undefined ? {} : { meta: b.meta };
  if (Array.isArray(b.data)) return { items: b.data, ...meta };
  if (b.data && typeof b.data === "object") return { ...(b.data as object), ...meta };
  return { value: b.data, ...meta };
}

export class RendexClient {
  constructor(private ctx: HookContext) {}

  /** Parse and unwrap the JSON body. An empty body (204) yields `{}`. */
  async json(path: string, options: RequestOptions = {}): Promise<Record<string, unknown>> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return {};
    return unwrap(JSON.parse(text));
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatRendexError(
          res.status,
          init.method ?? "GET",
          url.pathname,
          detail,
          res.headers.get("retry-after"),
        ),
      );
    }
    return res;
  }
}
