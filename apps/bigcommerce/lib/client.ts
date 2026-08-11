import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * BigCommerce REST Management API client.
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-08-11 against BigCommerce's own machine-readable OpenAPI 3.1
 * documents — served one per API family from `docs.bigcommerce.com/openapi/`
 * (the index is `docs.bigcommerce.com/docs/rest-catalog/openapi.json`) — plus
 * the prose reference at `docs.bigcommerce.com/developer` and live probes
 * against `api.bigcommerce.com`. Nothing came from a third-party integration
 * directory, and nothing came from `github.com/bigcommerce/api-specs`, which is
 * **archived** (GitHub `archived: true`, last push 2024-01-09, measured
 * 2026-08-11) and therefore not a source about today's API.
 *
 * ## One host; the store hash is a PATH segment
 *
 * Every OpenAPI document in the set declares exactly one server,
 * `https://api.bigcommerce.com`, and every path begins
 * `/stores/{store_hash}/v2/…` or `/stores/{store_hash}/v3/…`. Unlike Shopify
 * (`acme.myshopify.com`) or Zendesk, BigCommerce does **not** give a store its
 * own hostname — so this app's egress allowlist is a single exact host with no
 * wildcard, and nothing about the host is derived from the credential.
 *
 * The store hash is not a secret (it is in every request URL and in the store
 * control panel), so `afterConnect` publishes it to the Connection's redacted
 * `display` and {@link storeHashFromConnection} reads it back. Actions never see
 * the access token.
 *
 * ## v2 and v3 coexist, and v2 is NOT the old one
 *
 * This is the single most expensive thing to get wrong about BigCommerce.
 * "v3 replaced v2" is true for *some* resources and false for others, and the
 * vendor's own {@link https://docs.bigcommerce.com/developer/docs/overview/api-fundamentals/deprecations-sunsets Deprecations and Sunsets}
 * page is the only complete answer. Read on 2026-08-11 it deprecates exactly
 * these: `/v2/brands`, `/v2/categories`, `/v2/customers`, `/v2/options`,
 * `/v2/option_sets`, `/v2/pages`, `/v2/products`, `/v2/redirects`,
 * `/v3/hooks/events` and `/v3/content/widgets/search`.
 *
 * `/v2/orders` and `/v2/store` are **not** on that list, and there is no v3
 * replacement for either: the "Orders V3" reference
 * (`admin-management-order-operations`) contains only transactions, refunds,
 * metafields and settings — order CRUD exists solely at `/v2/orders`. So this
 * app calls v2 for orders and store information *because that is the current
 * API*, and v3 everywhere else. See `actions/order-list.ts`.
 *
 * ## A deprecation the machine-readable spec does not carry
 *
 * Not one operation in any of the twenty documents this app was built from sets
 * OpenAPI's `deprecated: true` — including `/v3/catalog/categories`, which the
 * Deprecations page lists as deprecated in favour of the Category Trees
 * endpoints. The only in-spec signal is a sentence at the head of each
 * description: "When possible, use the [Catalog Trees …] endpoint instead."
 * A generator trusting the `deprecated` flag would have shipped the dead one, so
 * this app lists categories from `/v3/catalog/trees/categories`.
 *
 * ## Two response envelopes
 *
 *  - **v3** answers `{"data": …, "meta": {"pagination": {…}}}`. `meta.pagination`
 *    carries `total`, `count`, `per_page`, `current_page`, `total_pages` and
 *    `links`.
 *  - **v2** answers the resource **bare** — a naked JSON array for a collection,
 *    a naked object for a single resource — with **no envelope and no pagination
 *    metadata at all**. There is no `total` and no `total_pages` for orders; you
 *    page until a page comes back short. `/v2/orders/count` exists precisely
 *    because the list cannot tell you.
 *
 * So the client exposes {@link BigCommerceClient.v3} (unwraps `data`),
 * {@link BigCommerceClient.v3Page} (returns `data` + `meta`) and
 * {@link BigCommerceClient.v2} (no unwrapping) rather than pretending there is
 * one shape.
 *
 * ## 204 is a normal answer to a GET here
 *
 * BigCommerce documents `204 No Content` on *read* endpoints, not just deletes:
 * a v2 order's shipping quotes "return a 204 … since a shipping quote is not
 * generated" for any order created through the API or control panel. A client
 * that assumes a 2xx GET has a JSON body throws on a perfectly ordinary
 * response, so {@link BigCommerceClient.send} maps an empty body to `undefined`
 * and a v2 collection read to `[]`.
 *
 * ## Errors
 *
 * v3 failures are RFC-7807-shaped: `{status, title, type, instance?, errors?}`
 * where `errors` is a field-name → message map. v2 failures are not described in
 * any of the OpenAPI documents, so {@link formatBigCommerceError} reads the v3
 * shape when it is there and falls back to the raw body rather than asserting a
 * v2 envelope this app cannot verify.
 *
 * The two 401 bodies are special and are handled by name, because they are the
 * difference between "reconnect this Connection" and "the credential never
 * reached the request" — see {@link classifyAuthFailure}.
 *
 * ## Rate limits
 *
 * A quota refreshed every 30 seconds, sized by store plan (450/30 s on Pro,
 * 150/30 s on Plus and Standard) and **shared by every app touching the store**.
 * Responses carry `X-Rate-Limit-Requests-Quota`, `X-Rate-Limit-Requests-Left`,
 * `X-Rate-Limit-Time-Window-Ms` and `X-Rate-Limit-Time-Reset-Ms`; `health/quota.ts`
 * reads them. Header names are documented as case-insensitive, so this module
 * only ever looks them up through `Headers.get`.
 */

/** The one and only API origin. Every OpenAPI document declares this single server. */
export const API_BASE = "https://api.bigcommerce.com";

/** The vendor's own header. Not `Authorization` — see `auth/access-token.ts`. */
export const AUTH_HEADER = "x-auth-token";

export type QueryValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | Array<string | number>;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** `meta.pagination` on a v3 collection response. */
export interface BigCommercePagination {
  total?: number;
  count?: number;
  per_page?: number;
  current_page?: number;
  total_pages?: number;
  links?: { previous?: string; current?: string; next?: string };
}

/** What a v3 collection read returns to an Action. */
export interface BigCommercePage<T> {
  data: T[];
  pagination?: BigCommercePagination;
  /** Present only on `/v3/customers` and `/v3/pricelists` — see {@link BigCommerceClient.v3Page}. */
  cursor?: Record<string, unknown>;
}

interface V3Envelope<T> {
  data?: T;
  meta?: { pagination?: BigCommercePagination; cursor_pagination?: Record<string, unknown> };
}

/** The v3 error body, per `error_Base` / `ErrorResponse` in the OpenAPI documents. */
interface BigCommerceErrorBody {
  status?: number;
  title?: string;
  type?: string;
  instance?: string;
  detail?: string;
  errors?: Record<string, unknown>;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `is_visible=false` and `limit=0` are both meaningful
 * filters, and silently dropping them would make them impossible to express.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Render a genuinely boolean query parameter.
 *
 * BigCommerce uses **two** spellings for booleans in query strings and the
 * choice is per-parameter, documented in each parameter's own schema:
 * `is_visible` on `GET /v3/catalog/products` is `type: boolean` (so `true` /
 * `false`), while `is_featured` and `is_free_shipping` on the same endpoint are
 * `type: integer` described as "`1` for true, `0` for false". Sending the wrong
 * spelling filters on nothing. {@link bool} is for the first kind,
 * {@link flag01} for the second, and each call site names which one the vendor
 * documents.
 */
export function bool(v: boolean | undefined): string | undefined {
  return v === undefined || v === null ? undefined : v ? "true" : "false";
}

/** The `1` / `0` spelling. See {@link bool}. */
export function flag01(v: boolean | undefined): string | undefined {
  return v === undefined || v === null ? undefined : v ? "1" : "0";
}

/** Normalise a `multiselect` / comma-list param into a list. */
export function toList(
  v: Array<string | number> | string | number | undefined | null,
): Array<string | number> | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => (typeof s === "number" ? s : String(s).trim()))
    .filter((s) => s !== "");
  return items.length ? items : undefined;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host hands a `json` param through in whichever shape it arrived, so both
 * are handled here rather than at each call site.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Same, but absence is an error. */
export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/** Keep an error message readable — a 422 body can list every invalid field. */
export function truncate(text: string, max = 700): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Accept either a bare store hash or the **API path** the control panel shows.
 *
 * BigCommerce's store-level API account screen presents three values, and the
 * one labelled "API path" is a full URL — `https://api.bigcommerce.com/stores/
 * {hash}/v3/` — which is what a merchant has on their clipboard. The vendor's
 * own guide describes it that way ("The **API path** is the URL to which you
 * make requests"), so pasting it is the expected mistake rather than an exotic
 * one, and it is cheaper to accept than to explain.
 *
 * Anything else is trimmed only. A value that still contains a `/` after this is
 * rejected loudly rather than concatenated into a URL.
 */
export function normalizeStoreHash(raw: unknown): string {
  const value = String(raw ?? "").trim();
  const fromPath = value.match(/\/stores\/([^/?#\s]+)/);
  return (fromPath ? fromPath[1] : value).trim();
}

/**
 * The store hash for this invocation, from the redacted Connection.
 *
 * It is recorded by `afterConnect`, not collected per Action: it identifies the
 * account, not the operation. It is deliberately read from `display` rather than
 * from the credential, because an Action must never touch the credential at all.
 */
export function storeHashFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { storeHash?: unknown };
  const hash = normalizeStoreHash(display.storeHash);
  if (!hash) {
    throw new Error(
      "BigCommerce connection records no store hash — reconnect the store so it can be recorded.",
    );
  }
  if (/[/?#\s]/.test(hash)) {
    throw new Error(`BigCommerce store hash is not a bare hash: ${JSON.stringify(hash)}`);
  }
  return hash;
}

/** `https://api.bigcommerce.com/stores/{hash}` — the prefix every path hangs off. */
export function storeBase(storeHash: string): string {
  return `${API_BASE}/stores/${encodeURIComponent(storeHash)}`;
}

/**
 * Path-escape a caller-supplied id.
 *
 * Ids here are integers or UUIDs, so this only ever neutralises a `/` or `?`
 * somebody pastes into an id field.
 */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * The two 401 bodies BigCommerce serves, and what each one actually means.
 *
 * **Measured on the wire, 2026-08-11**, against
 * `GET https://api.bigcommerce.com/stores/abc123/v3/catalog/products`:
 *
 *   | Request                          | Status | Content-Type       | Body                                        |
 *   | -------------------------------- | ------ | ------------------ | ------------------------------------------- |
 *   | no `X-Auth-Token` header         | 401    | `text/plain`       | `X-Auth-Token header is required`           |
 *   | `X-Auth-Token:` with empty value | 401    | `text/plain`       | `X-Auth-Token header should have correct format` |
 *   | `X-Auth-Token: <nonsense>`       | 401    | `application/json` | `{"status":401,"title":"Unauthorized",…}`   |
 *
 * The **status code is identical for all three** and the content type is the only
 * structural difference, which is exactly why this app classifies from the body.
 * "The header never arrived" is a wiring bug in the Connection; "the token was
 * rejected" is a bad or revoked credential; they have different fixes and both
 * arrive as a bare 401.
 *
 * One more measured fact shapes the messages: an unauthenticated request to a
 * **real** route answers `401 X-Auth-Token header is required`, while an
 * unauthenticated request to a route that does not exist answers
 * `404 The route is not found, check the URL` — so BigCommerce resolves the route
 * *before* authenticating, but authenticates *before* resolving the store. That
 * means **no 401 can tell you whether the store hash is right**, and this app
 * never claims otherwise. Per the vendor's own troubleshooting table, a wrong
 * store hash surfaces as a **403**, alongside a missing OAuth scope.
 */
export type AuthFailureKind = "missing-header" | "malformed-header" | "rejected" | "other";

export function classifyAuthFailure(status: number, rawBody: string): AuthFailureKind {
  if (status !== 401) return "other";
  const body = rawBody.trim();
  if (/^X-Auth-Token header is required/i.test(body)) return "missing-header";
  if (/^X-Auth-Token header should have correct format/i.test(body)) return "malformed-header";
  return "rejected";
}

/**
 * Turn a BigCommerce failure into one actionable line.
 *
 * The v3 body's `title` plus its `errors` map is what the vendor's own
 * troubleshooting is written against, so both are surfaced: a 422 that says
 * `{"price": "price is required"}` is a fixable input error, and flattening it
 * to "HTTP 422" hides which field.
 *
 * The message can carry only BigCommerce's own prose, the request path and the
 * caller's own input; the credential never enters this module.
 */
export function formatBigCommerceError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  const authKind = classifyAuthFailure(status, raw);
  if (authKind === "missing-header") {
    return `BigCommerce 401 for ${method} ${path}: no X-Auth-Token header reached the API — ` +
      "the credential did not get attached; reconnect this connection";
  }
  if (authKind === "malformed-header") {
    return `BigCommerce 401 for ${method} ${path}: the X-Auth-Token header was present but empty ` +
      "or malformed";
  }

  let parsed: BigCommerceErrorBody | null = null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      parsed = value as BigCommerceErrorBody;
    }
  } catch { /* v2 and the plain-text auth errors are not JSON — fall through */ }

  const parts: string[] = [`BigCommerce ${status} for ${method} ${path}`];
  if (parsed?.title) parts.push(parsed.title);
  if (parsed?.detail) parts.push(parsed.detail);
  const fields = parsed?.errors && typeof parsed.errors === "object"
    ? Object.entries(parsed.errors).map(([k, v]) => `${k}: ${String(v)}`)
    : [];
  if (fields.length > 0) parts.push(fields.join("; "));
  if (parts.length === 1) {
    // Nothing structured to say — the raw body is better than nothing, and for
    // v2 (whose error envelope no published OpenAPI document describes) it is
    // the only thing there is.
    const body = raw.trim();
    if (body) parts.push(truncate(body));
  }
  if (status === 429) {
    parts.push(
      "the store's 30-second request quota is shared by every app on the store; " +
        "back off for the X-Rate-Limit-Time-Reset-Ms window and retry",
    );
  }
  if (status === 403) {
    parts.push(
      "a 403 here means the API account lacks the OAuth scope for this resource, or the store " +
        "hash is wrong",
    );
  }
  return truncate(parts.join(": "), 1200);
}

/** The rate-limit headers on every response. See `health/quota.ts`. */
export interface RateLimitSnapshot {
  quota?: number;
  left?: number;
  windowMs?: number;
  resetMs?: number;
}

export function readRateLimit(headers: Headers): RateLimitSnapshot {
  const num = (name: string): number | undefined => {
    const raw = headers.get(name);
    if (raw === null || raw.trim() === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    quota: num("x-rate-limit-requests-quota"),
    left: num("x-rate-limit-requests-left"),
    windowMs: num("x-rate-limit-time-window-ms"),
    resetMs: num("x-rate-limit-time-reset-ms"),
  };
}

export class BigCommerceClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = storeBase(storeHashFromConnection(ctx.connection));
  }

  /** A v3 single-resource read/write: `{"data": …}` in, `data` out. */
  async v3<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.send<V3Envelope<T>>(`/v3${path}`, options);
    if (body && typeof body === "object" && "data" in body) return body.data as T;
    return body as unknown as T;
  }

  /**
   * A v3 collection read: `data` plus the `meta.pagination` block.
   *
   * `cursor` is carried through because two endpoints in this app's surface —
   * `GET /v3/customers` and `GET /v3/pricelists` — accept **both** `page`/`limit`
   * and cursor `after`/`before`, and the vendor documents that the meta block
   * *changes shape* depending on which you used: both `pagination` and
   * `cursor_pagination` on page 1, only `pagination` when `page > 1`, only
   * `cursor_pagination` when `before`/`after` was supplied. A caller that reads
   * `meta.pagination.total_pages` after paging by cursor gets `undefined`.
   */
  async v3Page<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<BigCommercePage<T>> {
    const body = await this.send<V3Envelope<T[]>>(`/v3${path}`, options);
    return {
      data: Array.isArray(body?.data) ? body.data : [],
      pagination: body?.meta?.pagination,
      cursor: body?.meta?.cursor_pagination,
    };
  }

  /**
   * A v2 read/write. **No unwrapping**: v2 answers the resource bare.
   *
   * Passing a v2 collection through {@link BigCommerceClient.v3} would return
   * the array unchanged only by accident and would break the day BigCommerce
   * adds a `data` key, so the two are separate methods rather than one method
   * with a flag.
   */
  v2<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.send<T>(`/v2${path}`, options);
  }

  /** A v2 collection read, with an empty (`204`) response normalised to `[]`. */
  async v2List<T = unknown>(path: string, options: RequestOptions = {}): Promise<T[]> {
    const body = await this.send<T[] | undefined>(`/v2${path}`, options);
    return Array.isArray(body) ? body : [];
  }

  /** Status only, for the endpoints that answer 204 with no body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.request(path, options);
    return res.status;
  }

  private async send<T>(path: string, options: RequestOptions): Promise<T> {
    const res = await this.request(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text.trim()) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async request(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // BigCommerce's multi-valued filters (`id:in`, `sku:in`, `include`,
      // `include_fields`, …) are documented as ONE comma-separated value, not as
      // a repeated key.
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      // The vendor's troubleshooting table lists a missing `content-type` as a
      // documented cause of a 400 on every request that carries a body.
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    // No credential here. The runtime routes this request through the auth
    // `sign` hook, which is the only code that ever sees the access token.
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatBigCommerceError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
