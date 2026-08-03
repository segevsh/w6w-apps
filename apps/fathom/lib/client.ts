/**
 * Fathom's **External API** — the AI meeting notetaker at fathom.video /
 * fathom.ai, *not* Fathom Analytics (usefathom.com). Verified against the
 * vendor's own OpenAPI document at
 * `https://developers.fathom.ai/api-reference/openapi.yaml`
 * (`info.title: "Fathom External API"`, fetched 2026-08-03) and the prose docs
 * at `https://developers.fathom.ai/api-overview` and `/quickstart`.
 *
 * ## Base URL
 *
 * One server, no regions, no per-tenant hosts:
 * `https://api.fathom.ai/external/v1` (the spec's single `servers[0].url`).
 *
 * ## Envelope
 *
 * The five list endpoints (`/meetings`, `/meeting_types`, `/teams`,
 * `/team_members`, `/users`) share one cursor-paginated wrapper:
 *
 * ```json
 * { "limit": 10, "next_cursor": "eyJwYWdlX251bSI6Mn0=", "items": [ … ] }
 * ```
 *
 * `next_cursor` is `null` on the last page; feed it back as the `cursor` query
 * param to get the next one. There is no offset/limit form and no page-size
 * parameter — `limit` is reported by the server, not chosen by the caller.
 *
 * Everything else is unwrapped: the recording endpoints return their payload
 * directly (`{ summary: … }`, `{ transcript: [ … ] }`, a download object), and
 * `DELETE /webhooks/{id}` answers 204 with no body at all.
 *
 * ## Array query params
 *
 * `recorded_by`, `teams` and `calendar_invitees_domains` are `style: form,
 * explode: true` arrays whose parameter NAME carries the brackets — the spec
 * writes them as `recorded_by[]`, and the docs' own example is
 * `recorded_by[]=ceo@acme.com&recorded_by[]=pm@acme.com`. This client appends
 * the `[]` itself so callers pass the plain key.
 *
 * ## Errors
 *
 * Fathom documents the status codes (400 / 401 / 403 / 404 / 422 / 429) but
 * publishes no error-body schema, so this client reports the status plus a
 * truncated body rather than pretending to know a field name.
 *
 * ## Rate limits
 *
 * Documented as response headers — `RateLimit-Limit`, `RateLimit-Remaining`,
 * `RateLimit-Reset`, and `Retry-After` on a 429. `readRateLimit` normalises
 * them for the `quota` health check. The published ceilings are 60 calls / 60s
 * globally, 30 / 60s for "heavy" requests (the recording summary and transcript
 * endpoints, and `/meetings` with `include_summary` or `include_transcript`),
 * and 30 / 60s for download requests.
 */
import type { HookContext } from "@w6w/types";

/** The API's only host. Mirrored in `w6w.network.allow`. */
export const API_HOST = "api.fathom.ai";

/** The spec's single `servers[0].url`. */
export const API_BASE = "https://api.fathom.ai/external/v1";

export type QueryValue =
  | string
  | number
  | boolean
  | Array<string | number>
  | undefined
  | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** JSON request body. Only the two POST endpoints take one. */
  body?: Record<string, unknown>;
}

/** The wrapper every list endpoint returns. */
export interface FathomPage<T = unknown> {
  limit: number | null;
  next_cursor: string | null;
  items: T[];
}

/** The normalised shape a list Action returns. */
export interface ListResult<T = unknown> {
  items: T[];
  nextCursor: string | null;
  limit: number | null;
}

/** Drop keys the caller left unset so an optional body field isn't sent as null. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** A rate-limit reading lifted off a response's headers. */
export interface RateLimitReading {
  limit?: number;
  remaining?: number;
  /** Seconds left in the current window, per the docs' "time remaining" wording. */
  resetSeconds?: number;
  /** Only sent on a 429. */
  retryAfterSeconds?: number;
}

const num = (v: string | null): number | undefined => {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Read Fathom's documented rate-limit headers. Header names are matched
 * case-insensitively by `Headers.get`, so the docs' `RateLimit-Limit` casing is
 * used verbatim here.
 */
export function readRateLimit(headers: Headers): RateLimitReading {
  return {
    limit: num(headers.get("RateLimit-Limit")),
    remaining: num(headers.get("RateLimit-Remaining")),
    resetSeconds: num(headers.get("RateLimit-Reset")),
    retryAfterSeconds: num(headers.get("Retry-After")),
  };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets an auth header — the runtime
 * routes every request through the auth `sign` hook, which stamps `X-Api-Key`.
 */
export class FathomClient {
  constructor(private ctx: HookContext) {}

  /** Build an absolute URL, expanding array params into the `key[]=v` form. */
  static url(path: string, query: Record<string, QueryValue> = {}): string {
    const url = new URL(`${API_BASE}${path}`);
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(`${key}[]`, String(item));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  /** Issue a request and hand back the raw `Response` (used by the quota probe). */
  send(path: string, options: RequestOptions = {}): Promise<Response> {
    const method = (options.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    return this.ctx.fetch(FathomClient.url(path, options.query ?? {}), init);
  }

  /**
   * Issue a request and parse the JSON body. Returns `undefined` for a 204
   * (which is exactly what `DELETE /webhooks/{id}` answers).
   */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T | undefined> {
    const method = (options.method ?? "GET").toUpperCase();
    const res = await this.send(path, options);
    const text = await res.text();

    if (!res.ok) {
      throw new Error(
        `Fathom ${res.status} for ${method} ${new URL(FathomClient.url(path)).pathname}: ${
          text ? text.slice(0, 200) : res.statusText
        }`,
      );
    }
    if (!text) return undefined;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Fathom returned a non-JSON body for ${method} ${path}`);
    }
  }

  /** Issue a request against a cursor-paginated list endpoint. */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<ListResult<T>> {
    const page = await this.request<FathomPage<T>>(path, options);
    return {
      items: page?.items ?? [],
      nextCursor: page?.next_cursor ?? null,
      limit: page?.limit ?? null,
    };
  }
}
