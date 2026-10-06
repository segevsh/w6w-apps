import type { HookContext } from "@w6w/types";

/**
 * Avoma REST client.
 *
 * Everything here comes from Avoma's own OpenAPI document
 * (`https://dev.avoma.com/openapi.yml`, fetched 2026-10-06, 43 paths) plus live
 * unauthenticated probes against `api.avoma.com` on the same day. Nothing came from a
 * third-party integration directory.
 *
 * ## One host, one prefix
 *
 * The document declares one server, `https://api.avoma.com`, and every path carries `/v1`.
 * There is no regional host. Paths keep their **trailing slash** (`/v1/meetings/`) exactly
 * as documented; this client never strips it.
 *
 * ## Errors are `{"detail": "..."}` (or `{"message": "..."}`)
 *
 * Measured 2026-10-06, both with HTTP 401 and `content-type: application/json`:
 *
 * ```
 * no Authorization header  -> {"detail":"Auth missing in header and cookie"}
 * Bearer <garbage>         -> {"detail":"Invalid Token"}
 * ```
 *
 * The spec also documents `{"message": "..."}` on the drop-meeting 403/406. {@link errorText}
 * reads either, so the vendor's own sentence reaches the workflow author.
 *
 * ## Pagination
 *
 * List endpoints answer `{count, next, previous, results}` where `next` / `previous` are
 * full URLs. Only transcriptions and snippets document a `page` parameter, so rather than
 * guess one for the others, list actions accept the `next` URL from the previous response
 * and follow it verbatim ({@link AvomaClient.list}). It is only followed when it points at
 * the API's own origin, so a response can never steer a signed request to another host.
 * `GET /v1/users/` is documented as a bare array and is normalised to the same shape.
 *
 * ## Rate limit and timeout
 *
 * 60 requests per minute and a 60-second server-side timeout (spec, "Rate Limits"). Wide
 * date ranges can time out even when the range looks small, so the list actions say so.
 */

export const API_BASE = "https://api.avoma.com";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** The normalised list shape every list action returns. */
export interface AvomaPage {
  results: unknown[];
  count: number;
  next: string | null;
  previous: string | null;
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

/** Comma-join a list for the params the spec documents as "comma-separated". */
export function csv(v: string[] | string | undefined | null): string | undefined {
  return toList(v)?.join(",");
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

/** The vendor's own sentence from an error body, whichever key it used. */
export function errorText(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  for (const k of ["detail", "message", "error"]) {
    if (typeof b[k] === "string" && b[k]) return b[k] as string;
  }
  return undefined;
}

/** Fold a bare array or a `{count,next,previous,results}` envelope into {@link AvomaPage}. */
export function toPage(body: unknown): AvomaPage {
  if (Array.isArray(body)) {
    return { results: body, count: body.length, next: null, previous: null };
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const results = Array.isArray(b.results) ? b.results : [];
  return {
    results,
    count: typeof b.count === "number" ? b.count : results.length,
    next: typeof b.next === "string" ? b.next : null,
    previous: typeof b.previous === "string" ? b.previous : null,
  };
}

/** Only follow a `next` URL that stays on the API origin. */
export function assertApiUrl(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error("Avoma: `next` is not a valid URL");
  }
  if (u.origin !== API_BASE || !u.pathname.startsWith("/v1/")) {
    throw new Error(`Avoma: refusing to follow a page URL outside ${API_BASE}/v1/`);
  }
  return u.toString();
}

/**
 * Thin client over `ctx.fetch`. It never sets `Authorization` — the runtime routes every
 * request through the auth `sign` hook, the only code handed the credential.
 */
export class AvomaClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    return await this.send<T>(`${API_BASE}${path}${queryString(opts.query)}`, opts);
  }

  get<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>(path, { query });
  }

  /** A list call. When `next` is given it is followed verbatim and `query` is ignored. */
  async list(
    path: string,
    query: Record<string, QueryValue>,
    next?: string,
  ): Promise<AvomaPage> {
    const url = next ? assertApiUrl(next) : `${API_BASE}${path}${queryString(query)}`;
    return toPage(await this.send(url, {}));
  }

  private async send<T>(url: string, opts: RequestOptions): Promise<T> {
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
        if (res.ok) throw new Error(`Avoma ${res.status}: response was not JSON`);
      }
    }
    if (!res.ok) {
      const msg = errorText(parsed) ?? (text ? text.slice(0, 300) : res.statusText);
      throw new Error(`Avoma ${res.status}${msg ? `: ${msg}` : ""}`);
    }
    return parsed as T;
  }
}
