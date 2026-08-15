import type { HookContext } from "@w6w/types";

/**
 * Thinkific Admin API v1 REST client.
 *
 * Everything in this module was verified on 2026-08-15 against Thinkific's own
 * OpenAPI 3.0.1 document (`developers.thinkific.com/openapi/thinkific-admin-api-v1.yaml`,
 * 164,389 bytes), the "REST API Response Format", "REST API Rate Limits" and
 * "Authorization using API Key" support articles, and live probes against
 * `api.thinkific.com`. Nothing here came from a third-party integration directory.
 *
 * ## One host, one prefix, no per-tenant subdomain
 *
 * The OpenAPI document declares exactly one server,
 * `https://api.thinkific.com/api/public/v1`. Unlike a lot of "subdomain" SaaS
 * APIs, the Thinkific *site* subdomain a request is scoped to is carried as the
 * `X-Auth-Subdomain` **header value** the API-key auth flow requires — it is
 * never part of the URL. See `auth/api-key.ts`: the client host below is a
 * constant, and no action ever builds a per-tenant host from a param.
 *
 * ## Two response envelopes
 *
 * A single-resource endpoint (`GET /courses/{id}`) returns the resource object
 * directly. Every list endpoint answers the same paginated envelope:
 * `{"items": [...], "meta": {"pagination": {...}}}`. {@link ThinkificClient.list}
 * unwraps that; {@link ThinkificClient.json} returns a body as-is for the
 * single-resource case.
 *
 * ## Pagination
 *
 * `limit` defaults to 25 and can be raised to a documented maximum of **250**
 * ("REST API Response Format" — Pagination). Requesting more silently gets
 * capped by the vendor rather than erroring, so every list action here states
 * that ceiling in its own `limit` param instead of letting a caller believe a
 * larger number does something.
 *
 * ## Three error-body shapes, not one
 *
 * Every failure carries a JSON body, but the vendor uses three different
 * shapes for it depending on *which* kind of failure it is:
 *
 *  - **Auth / not-found / plan-gating**: `{"error": "<message>"}` — a bare
 *    string. Confirmed live: `{"error":"Authentication Error"}` (401, both the
 *    OAuth-bearer and the X-Auth-API-Key path) and `{"error":"Record not
 *    found."}` (404, per the `ErrorNotFound` schema).
 *  - **OAuth scope errors**: also `{"error": "<message>"}`, but the specific
 *    message ("App does not have permission to perform this action...") only
 *    applies to OAuth-scoped tokens — this app's API-key auth is explicitly
 *    exempt from OAuth scopes ("REST Permissions and Scopes": "This does not
 *    apply to apps using the API Key Authorization"), so a 403 here means
 *    something else (see below).
 *  - **Validation (422)**: `{"errors": ...}`, and the vendor's own docs are
 *    internally inconsistent about the shape of `...`. The "REST API Response
 *    Format" article shows an object keyed by field name
 *    (`{"errors": {"email": ["has already been taken"]}}`), but the OpenAPI
 *    document's own worked example for `POST /enrollments` shows a bare array
 *    of strings (`{"errors": ["Course could not be found.", "User could not
 *    be found."]}`), and the `UnprocessableEntityError` schema declares yet a
 *    third shape (an array of `{"field_name": "..."}` objects). All three are
 *    handled here rather than assuming one.
 *
 * A 401 is additionally ambiguous on its own: the "Authorization using API
 * Key" article notes "This 401 error will occur if the site's Thinkific
 * pricing plan does not allow access to the API" — the *same* body as a wrong
 * key. `formatThinkificError` says so rather than pretending the credential is
 * always at fault.
 *
 * ## Rate limits
 *
 * 120 requests/minute per Site, plus a 10-in-flight concurrency ceiling
 * ("REST API Rate Limits"). A 429 response carries a `RateLimit-Reset` header
 * (epoch **milliseconds** until the window resets) but ordinary responses
 * carry no remaining-count header of any kind — there is nothing to read
 * proactively, which is why `health/quota.ts` declares the dimension
 * unavailable rather than guessing.
 */

/** The one and only API origin, per the OpenAPI document's single `servers` entry. */
export const API_BASE = "https://api.thinkific.com/api/public/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

export interface ThinkificPagination {
  current_page?: number;
  next_page?: number | null;
  prev_page?: number | null;
  total_pages?: number;
  total_items?: number;
  entries_info?: string;
}

/** The `{"items": [...], "meta": {"pagination": {...}}}` envelope every list endpoint answers. */
export interface ThinkificListPage<T> {
  items: T[];
  meta?: { pagination?: ThinkificPagination };
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful query values. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * `query[foo]=bar` — every list endpoint's filter parameters are namespaced
 * this way (`query[email]`, `query[course_id]`, ...), never bare.
 */
export function queryFilters(filters: Record<string, QueryValue>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(compact(filters))) out[`query[${k}]`] = v as QueryValue;
  return out;
}

/** Keep an error message readable — a validation body can carry many fields. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** The three documented `errors` shapes, flattened to one readable line. */
export function formatValidationErrors(errors: unknown): string {
  if (Array.isArray(errors)) {
    return errors
      .map((e) =>
        typeof e === "string" ? e : e && typeof e === "object"
          ? String(
            (e as { field_name?: string; message?: string }).message ??
              (e as { field_name?: string }).field_name ?? JSON.stringify(e),
          )
          : String(e)
      )
      .join("; ");
  }
  if (errors && typeof errors === "object") {
    return Object.entries(errors as Record<string, unknown>)
      .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : String(msgs)}`)
      .join("; ");
  }
  return String(errors);
}

interface ThinkificErrorBody {
  error?: string;
  errors?: unknown;
}

/**
 * Turn a Thinkific error body into one actionable line. See the module doc for
 * the three body shapes and why a 401 does not always mean "bad credential".
 */
export function formatThinkificError(
  status: number,
  method: string,
  path: string,
  raw: string,
  resetHeader?: string | null,
): string {
  let parsed: ThinkificErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ThinkificErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (status === 429) {
    const resetIn = resetHeader ? Number(resetHeader) - Date.now() : undefined;
    return `Thinkific rate limit exceeded for ${method} ${path} (120 requests/minute, 10 ` +
      `concurrent, per Site)${
        resetIn && resetIn > 0 ? ` — resets in ${Math.ceil(resetIn / 1000)}s` : ""
      }`;
  }

  if (status === 401 && parsed?.error) {
    return `Thinkific ${status} for ${method} ${path}: ${parsed.error} — either the credential ` +
      "is wrong/revoked, or this Site's Thinkific plan does not include API access (Grow/Pro + " +
      "Growth plan or above is required).";
  }

  if (parsed?.errors !== undefined) {
    return truncate(
      `Thinkific ${status} for ${method} ${path}: ${formatValidationErrors(parsed.errors)}`,
      1000,
    );
  }
  if (parsed?.error) return `Thinkific ${status} for ${method} ${path}: ${parsed.error}`;

  return `Thinkific ${status} for ${method} ${path}: ${truncate(raw)}`;
}

export class ThinkificClient {
  constructor(private ctx: HookContext) {}

  /** A single-resource response, parsed and returned as-is. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** A paginated `{items, meta}` list response. */
  async list<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<ThinkificListPage<T>> {
    return await this.json<ThinkificListPage<T>>(path, options);
  }

  /** Status only, for endpoints that answer 204 with no body (update / delete). */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
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
        formatThinkificError(
          res.status,
          init.method ?? "GET",
          url.pathname,
          detail,
          res.headers.get("ratelimit-reset"),
        ),
      );
    }
    return res;
  }
}
