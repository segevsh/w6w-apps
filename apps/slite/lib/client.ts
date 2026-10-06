import type { HookContext } from "@w6w/types";

/**
 * Slite REST client.
 *
 * Everything here comes from Slite's own readme.io reference
 * (`https://developers.slite.com/`, branch 1.0, the per-operation OpenAPI documents behind
 * every `/reference/*` page, fetched 2026-10-06) plus live unauthenticated probes against
 * `api.slite.com` the same day. Nothing came from a third-party integration directory.
 *
 * ## One host, one prefix
 *
 * The documents declare one server, `https://api.slite.com/v1`. There is no regional host.
 *
 * ## Errors are `{"id": "...", "message": "..."}`
 *
 * Measured 2026-10-06, HTTP 401, `content-type: application/json`, whether the key header was
 * absent, an `x-slite-api-key` garbage value or an `Authorization: Bearer` garbage value:
 *
 * ```
 * {"id":"auth/unauthorized","message":"Invalid apiKey"}
 * ```
 *
 * An unknown path answers `404 {"id":"route/not-found","message":"Route not found: …"}`.
 * The reference documents `422 field-validation` (with `details`), `429 rate-limit`, and for
 * `/ask` a separate `AskRateLimitedError` / `AskDisabledError` shape. {@link errorText} and
 * {@link errorId} read the vendor's own sentence and code.
 *
 * ## Two pagination styles
 *
 *  - **Cursor** (notes, children, knowledge-management, users, groups): the response carries
 *    `nextCursor` / `hasNextPage`; pass `nextCursor` back as `cursor`.
 *  - **Page number** (note search): zero-based `page` plus `hitsPerPage` (1-100); the response
 *    carries `page` and `nbPages`.
 *
 * ## `202 processing` is a success status
 *
 * `GET /ask` and `GET /threads/{id}` answer `202` while an answer is still being prepared.
 * {@link SliteClient.requestRaw} hands the status back so those actions can say so instead of
 * returning a half-empty answer as though it were final.
 */

export const API_BASE = "https://api.slite.com";
export const API_PREFIX = "/v1";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

export interface RawResponse<T = unknown> {
  status: number;
  body: T;
  retryAfter?: string;
}

/** Drop unset values; `false` and `0` are meaningful and kept. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Normalise a multiselect/CSV form value into a trimmed list, or `undefined`. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Build `?a=1&b=2`; arrays repeat the key (OpenAPI default `explode: true`). */
export function queryString(query: Record<string, QueryValue> = {}): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(compact(query))) {
    if (Array.isArray(v)) { for (const item of v) sp.append(k, item); }
    else sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** The vendor's own sentence from an error body. */
export function errorText(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const m = (body as Record<string, unknown>).message;
  return typeof m === "string" && m ? m : undefined;
}

/** The vendor's machine code from an error body (`auth/unauthorized`, `rate-limit`, …). */
export function errorId(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const id = (body as Record<string, unknown>).id;
  return typeof id === "string" && id ? id : undefined;
}

/**
 * Thin client over `ctx.fetch`. It never sets a credential header — the runtime routes every
 * request through the auth `sign` hook, the only code handed the credential.
 */
export class SliteClient {
  constructor(private ctx: HookContext) {}

  async requestRaw<T = unknown>(path: string, opts: RequestOptions = {}): Promise<RawResponse<T>> {
    const url = `${API_BASE}${API_PREFIX}${path}${queryString(opts.query)}`;
    const headers: Record<string, string> = { accept: "application/json" };
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(url, { method: opts.method ?? "GET", headers, body });
    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        if (res.ok) throw new Error(`Slite ${res.status}: response was not JSON`);
      }
    }
    if (!res.ok) {
      const msg = errorText(parsed) ?? (text ? text.slice(0, 300) : res.statusText);
      const id = errorId(parsed);
      throw new Error(`Slite ${res.status}${msg ? `: ${msg}` : ""}${id ? ` (${id})` : ""}`);
    }
    return {
      status: res.status,
      body: parsed as T,
      retryAfter: res.headers.get("retry-after") ?? undefined,
    };
  }

  async request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    return (await this.requestRaw<T>(path, opts)).body;
  }

  get<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>(path, { query });
  }
}
