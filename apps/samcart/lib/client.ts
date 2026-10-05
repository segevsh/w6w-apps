import type { HookContext } from "@w6w/types";

/**
 * SamCart Public API client.
 *
 * Read from SamCart's own OpenAPI document (`developer.samcart.com/specs/openapi.yaml`,
 * "SamCart Public API", fetched 2026-10-05). The only unauthenticated probes made
 * were against `api.samcart.com` to see the gateway's error bodies; nothing was
 * exercised with a real key, so every success shape below is "documented", not
 * "measured".
 *
 * ## One host, one prefix
 *
 * `servers: https://api.samcart.com/v1`. The reference also says HTTP is redirected
 * to HTTPS with a 301; this client only ever sends HTTPS.
 *
 * ## Errors have two shapes
 *
 * The gateway answers `{"message": "..."}` (401 `Invalid authentication credentials`,
 * 401 `No API key found in request`, 403 plan/inactive account, 429 `Too many
 * requests`), while a validation failure inside the API is documented as
 * `{"success": false, "error": "...", "data": null}`. {@link formatSamCartError}
 * keeps whichever the vendor sent, verbatim.
 *
 * ## Pagination
 *
 * Paginated lists answer `{ "data": [...], "pagination": { "next", "prev" } }`
 * where `next`/`prev` are full URLs carrying `offset` (a record id) and `dir`.
 * {@link page} hands the caller the data, both URLs and the `offset` to pass
 * back. The un-paginated per-resource lists answer a bare JSON array.
 *
 * ## Ids
 *
 * Path ids are integers in the reference. {@link intId} refuses anything else
 * before it can be spliced into a path.
 */

export const API_BASE = "https://api.samcart.com";
export const API_PREFIX = "/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  /** Sent as JSON. Keys whose value is `undefined`, `null` or `""` are dropped. */
  json?: Record<string, unknown>;
}

/** A positive integer id as a path segment; throws on anything else. */
export function intId(value: unknown, label = "id"): string {
  const text = String(value ?? "").trim();
  if (!/^[1-9][0-9]*$/.test(text)) {
    throw new Error(`${label} must be a positive integer, got ${JSON.stringify(value)}`);
  }
  return text;
}

/** Percent-encode one caller-supplied string as a single path segment. */
export function seg(value: unknown): string {
  return encodeURIComponent(String(value ?? "").trim());
}

/** Drop keys the caller left unset. `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Split a comma-separated string (or pass an array) into positive integers. */
export function toIntList(value: unknown, label: string): number[] {
  const items = (Array.isArray(value) ? value : String(value ?? "").split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.map((s) => Number(intId(s, label)));
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** One actionable line from a failed call. The vendor's own message is kept verbatim. */
export function formatSamCartError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let message: string | undefined;
  try {
    const parsed = JSON.parse(raw) as { message?: unknown; error?: unknown };
    if (typeof parsed?.message === "string") message = parsed.message;
    else if (typeof parsed?.error === "string") message = parsed.error;
  } catch { /* not JSON — fall through to the raw body */ }
  if (message === undefined) return `SamCart ${status} for ${method} ${path}: ${truncate(raw)}`;
  const hint = status === 401
    ? " (the API key was missing or rejected)"
    : status === 403
    ? " (the plan does not include API access, or the account is not active)"
    : status === 429
    ? " (rate limited; wait for the Retry-After seconds)"
    : "";
  return truncate(`SamCart ${status} for ${method} ${path}: ${message}${hint}`, 1000);
}

export interface Page<T = unknown> {
  data: T[];
  next: string | null;
  prev: string | null;
  /** The `offset` to pass back for the next page, or null on the last page. */
  nextOffset: string | null;
}

/** Shape a `{data, pagination}` body into the page an action returns. */
export function page(body: unknown): Page {
  const b = (body ?? {}) as { data?: unknown; pagination?: { next?: string; prev?: string } };
  const next = b.pagination?.next ?? null;
  let nextOffset: string | null = null;
  if (next) {
    try {
      nextOffset = new URL(next).searchParams.get("offset");
    } catch { /* leave null */ }
  }
  return {
    data: Array.isArray(b.data) ? b.data : b.data === undefined || b.data === null ? [] : [b.data],
    next,
    prev: b.pagination?.prev ?? null,
    nextOffset,
  };
}

export class SamCartClient {
  constructor(private ctx: HookContext) {}

  /** Call one endpoint and return the parsed JSON body (null for an empty body). Throws on non-2xx. */
  async call(method: string, path: string, options: RequestOptions = {}): Promise<unknown> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.json !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(compact(options.json));
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(formatSamCartError(res.status, method, url.pathname, text));
    if (text.trim() === "") return null;
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        `SamCart ${res.status} for ${method} ${url.pathname}: expected JSON, got ${
          truncate(text, 200)
        }`,
      );
    }
  }
}
