import type { HookContext } from "@w6w/types";

/**
 * Ecwid REST API v3 client.
 *
 * Every path, verb, query parameter, body field and response envelope used by
 * this app was read from Ecwid's own documentation (`docs.ecwid.com`, which
 * serves clean Markdown at `<page>.md`) on 2026-09-22, and the three response
 * envelopes below were each confirmed against the example on the page that
 * documents them. Three of the facts were additionally confirmed by live
 * probes against `app.ecwid.com` the same day. Nothing here came from a
 * third-party integration directory.
 *
 * ## One origin, one prefix, and the store id inside the PATH
 *
 * The base is `https://app.ecwid.com/api/v3/{storeId}/…`: a fixed hostname and
 * a `{storeId}` **path segment**, not a per-tenant hostname (`storeId` is
 * also called "Ecwid store ID" throughout the docs, and the vendor's own
 * request examples address the demo store as `/api/v3/1003/products`). So the
 * egress allowlist is a single host, and the store id is part of the
 * connection's configuration rather than something derived from a token.
 *
 * That has one consequence worth stating plainly: the client cannot bake the
 * store id into a URL, because `ctx.fetch` is what routes a request through
 * the auth `sign` hook and the credential — store id included — is only ever
 * available to `sign`. The client therefore builds
 * `/api/v3/__storeId__<path>` and `sign` substitutes the real id, exactly the
 * pattern `apps/folk/lib/client.ts` uses for its `/network/{networkId}/…`
 * paths and `apps/mailchimp/lib/client.ts` for its datacenter-in-hostname
 * scheme. See {@link STORE_PLACEHOLDER} for why the placeholder is a plain
 * token rather than the docs' own `{storeId}` braces.
 *
 * ## Three response envelopes, and which endpoint answers which
 *
 *  - **Lists** (`GET /products`, `/categories`, `/orders`, `/customers`,
 *    `/discount_coupons`) answer `{"total", "count", "offset", "limit",
 *    "items": [...]}` — confirmed in each page's own example. `items` may be
 *    missing when a caller narrows the response with `responseFields`.
 *  - **Creates** answer `{"id": …}` (`/products`, `/categories`, `/customers`,
 *    `/orders`), and `/discount_coupons` answers `{"id", "code"}`.
 *  - **Updates and deletes** answer a count: `{"updateCount": 1}` for
 *    `PUT`, `{"deleteCount": 1}` for `DELETE`, `{"updateCount": 1}` for
 *    `PUT /products/{id}/inventory` (which may add a `warning` when the
 *    resulting stock went negative).
 *
 * So this client exposes one method, {@link EcwidClient.json}, that parses the
 * body as JSON and hands it back whole. There is no envelope to unwrap — an
 * `EcwidClient.data` that guessed at one would be guessing wrong five times
 * out of six.
 *
 * ## Errors: `{"errorCode", "errorMessage"}` — with one documented exception
 *
 * The documented failure shape is `{"errorCode": "SOME_CODE", "errorMessage":
 * "…"}` (`docs.ecwid.com/api-reference/rest-api/rest-api-error-codes.md`
 * lists the codes and their statuses: `INVALID_API_TOKEN` and
 * `INSUFFICIENT_APP_SCOPE` are 403, `STORE_NOT_FOUND` is 404, `RATE_LIMITED`
 * is 429). That shape was confirmed live: an out-of-range store id answered
 * `404 {"errorCode":"STORE_NOT_FOUND","errorMessage":"Store not found"}`.
 *
 * **The exception — and it is a real, measured one.** Live probes on
 * 2026-09-22 against the documentation's own demo store (id `1003`) returned a
 * bare **`403` with an empty body** (`content-length: 0`) for *both* a missing
 * `Authorization` header and a syntactically-plausible-but-fake token. So for
 * this vendor a credential rejection cannot be classified from the body,
 * because there may be no body at all — the status is what carries the
 * verdict. That contradicts the pack's usual "classify from the body, never
 * the status" rule, so it is called out here and in `auth/api-key.ts`
 * explicitly: {@link parseEcwidError} is still preferred whenever a JSON body
 * *is* present (a `STORE_NOT_FOUND` body is authoritative and is reported
 * verbatim), and only an empty body falls back to the status-based text in
 * {@link EMPTY_BODY_NOTE}.
 *
 * ## Rate limits
 *
 * 600 requests/minute **per token**; exceeding it is a `429` carrying a
 * `Retry-After` header in seconds. No endpoint or header publishes a remaining
 * count, which is why this app declares no readable quota headroom — see
 * `health/quota.ts`.
 */

/** The one and only API origin. No regional or sandbox host exists. */
export const API_URL = "https://app.ecwid.com";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/api/v3";

/**
 * Plain-token placeholder for the `{storeId}` path segment, substituted by
 * `auth/api-key.ts`'s `sign` hook — the only hook that holds the credential.
 *
 * Deliberately **not** the docs' own `{storeId}` braces: `sign` receives
 * `request.url` as a plain string, and anything upstream that normalises it
 * through `new URL(...)` escapes `{` and `}` to `%7B`/`%7D` (verified:
 * `new URL("https://x/{a}")` yields `.../%7Ba%7D`), which would silently stop
 * a literal `.replace("{storeId}", …)` from matching. An
 * alphanumeric-and-underscore token survives any such normalisation untouched.
 */
export const STORE_PLACEHOLDER = "__storeId__";

/**
 * Prefilled page size for every search action.
 *
 * Ecwid's own default *and* maximum is `100` (documented on each search page:
 * "Maximum and default value (if not specified) is `100`"). A workflow step that
 * silently returns the vendor's maximum is how a step's output becomes its own
 * performance problem, so the default here is smaller and the vendor's ceiling
 * is still reachable explicitly.
 */
export const DEFAULT_LIMIT = 50;

/** The vendor's documented maximum page size. */
export const VENDOR_MAX_LIMIT = 100;

/** Documented per-token request ceiling; the `429` is the only signal. */
export const RATE_LIMIT_PER_MINUTE = 600;

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

/** The `{"total", "count", "offset", "limit", "items"}` envelope of every search endpoint. */
export interface EcwidListPage<T> {
  total?: number;
  count?: number;
  offset?: number;
  limit?: number;
  items?: T[];
}

/** The documented failure body. Not always present — see this file's header. */
export interface EcwidErrorBody {
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Build a path against the placeholder store, for an action to pass to
 * {@link EcwidClient}.
 *
 * Exported so `auth/*.ts` and the tests address the same string the actions do.
 */
export function storePath(path: string): string {
  return `${API_PREFIX}/${STORE_PLACEHOLDER}${path}`;
}

/**
 * The absolute URL, for the two callers that *do* hold the store id: the auth
 * hooks (`test`, `afterConnect`), which build their own request rather than
 * going through the placeholder substitution.
 */
export function storeUrl(storeId: string | number, path: string): string {
  return `${API_URL}${API_PREFIX}/${encodeURIComponent(String(storeId ?? "").trim())}${path}`;
}

/**
 * Fill in the store id. Called by `sign`, which is the only hook holding the
 * credential — the same division of labour as
 * `apps/folk/auth/api-key.ts`'s `NETWORK_PLACEHOLDER` substitution.
 */
export function applyStoreId(url: string, storeId: string | number): string {
  return url.replace(STORE_PLACEHOLDER, encodeURIComponent(String(storeId ?? "").trim()));
}

/**
 * Drop keys the caller left unset, so a `PUT` does not clear untouched fields.
 *
 * `false` and `0` survive: `enabled: false` and `quantity: 0` are both
 * meaningful values that Ecwid documents, and silently dropping them would make
 * them impossible to express.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * A `json` field arrives in whichever shape the host had it in, so both are
 * handled here rather than at each call site.
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

/**
 * Merge free-form JSON over the typed fields, with the JSON winning.
 *
 * The vendor's own write bodies are enormous (product, order and the store
 * profile each document 40+ properties), so each action types the fields a
 * workflow actually sets and lets this carry the rest. "The JSON wins" is what
 * makes it safe to hand this app a whole object it already has.
 */
export function mergeBody(
  base: Record<string, unknown>,
  extra: unknown,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...compact(base) };
  if (extra === undefined || extra === null || extra === "") return merged;
  const parsed = asOptionalJson<unknown>(extra, "additional fields");
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("additional fields must be a JSON object");
  }
  return { ...merged, ...(parsed as Record<string, unknown>) };
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * The same, as numbers — for body fields the vendor types as `array of numbers`
 * (`categoryIds` on a product), where a comma-separated string is not accepted
 * even though the query-param form of the same filter is a comma-separated
 * string.
 */
export function numList(v: unknown): number[] | undefined {
  const items = csv(v);
  if (!items) return undefined;
  return items.map((item) => {
    const n = Number(item);
    if (!Number.isFinite(n)) throw new Error(`"${item}" is not a number`);
    return n;
  });
}

/**
 * Path-escape a caller-supplied id.
 *
 * Ecwid order ids are not purely numeric — the docs say an `orderId` "can
 * contain prefixes and suffixes, for example: `EG4H2,J77J8`" — while product,
 * category and customer ids are internal numbers. Both arrive as strings here
 * and are escaped rather than validated: a `/` or `?` pasted into an id field
 * must not become part of the path.
 */
export function encodeId(id: unknown): string {
  const value = String(id ?? "").trim();
  if (!value) throw new Error("an id is required");
  return encodeURIComponent(value);
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Try to read the documented `{"errorCode", "errorMessage"}` body.
 *
 * Returns `undefined` for anything that is not a JSON object carrying at least
 * one of the two fields — including an empty body, which this vendor really
 * does send on a 403 (see the file header) — so callers can fall back to the
 * status deliberately rather than by accident.
 */
export function parseEcwidError(text: string): EcwidErrorBody | undefined {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined;
  const record = parsed as Record<string, unknown>;
  const errorCode = typeof record.errorCode === "string" ? record.errorCode : undefined;
  const errorMessage = typeof record.errorMessage === "string" ? record.errorMessage : undefined;
  return errorCode || errorMessage ? { errorCode, errorMessage } : undefined;
}

/**
 * What to say when Ecwid answered with no body at all.
 *
 * The 403 entry is the documented exception: the status carries the verdict
 * because the documented `errorCode` is not reliably present. Live evidence is
 * in this file's header.
 */
const EMPTY_BODY_NOTE: Record<number, string> = {
  401: "empty body — treat this as a credential problem: Ecwid's documented token errors are 403 " +
    "INVALID_API_TOKEN / INSUFFICIENT_APP_SCOPE, and an unauthenticated request is refused " +
    "rather than answered",
  402: "empty body — the store is suspended, or the feature is not available on the store's plan " +
    "(STORE_IS_SUSPENDED / NOT_AVAILABLE_ON_CURRENT_PLAN)",
  403: "empty body — the credential was rejected or lacks the scope: live probing on 2026-09-22 " +
    "returned a bare 403 (content-length: 0) for BOTH a missing and an invalid token, so the " +
    "documented errorCode is not reliably present and the status is the verdict",
  404: "empty body — the store or the addressed record was not found",
  429: "empty body — the per-token rate limit was exceeded",
};

/**
 * One line a human can act on, preferring the vendor's own `errorCode`.
 *
 * Codes are surfaced verbatim because the fix differs per code: a `404
 * PRODUCT_NOT_FOUND` and a `409 SKU_ALREADY_EXISTS` both arrive as "the write
 * failed" to a client that flattens them into "HTTP 404".
 */
export function formatEcwidError(
  status: number,
  method: string,
  path: string,
  detail: string,
  retryAfter?: string | null,
): string {
  const err = parseEcwidError(detail);
  const parts = [
    `Ecwid ${status}${err?.errorCode ? ` ${err.errorCode}` : ""} for ${method} ${path}`,
  ];
  if (err?.errorMessage) parts.push(err.errorMessage);
  else if (detail.trim()) parts.push(truncate(detail));
  else parts.push(EMPTY_BODY_NOTE[status] ?? "empty body");
  if (status === 429) {
    parts.push(
      retryAfter
        ? `rate limited — retry after ${retryAfter}s`
        : `rate limited — Ecwid allows ${RATE_LIMIT_PER_MINUTE} requests/minute per token; ` +
          "retry with backoff",
    );
  }
  return truncate(parts.join(": "), 1000);
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * It never sets an `Authorization` header — the runtime routes every request
 * through the auth `sign` hook, which is where the token lives, and the URL it
 * builds carries {@link STORE_PLACEHOLDER} for that same hook to fill in.
 */
export class EcwidClient {
  constructor(private ctx: HookContext) {}

  /** Parse the response body as JSON. A `204` or an empty body yields `undefined`. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_URL}${storePath(path)}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Ecwid's multi-valued filters (`categories`, `fulfillmentStatus`, …) are
      // documented as ONE comma-separated value, not as a repeated key.
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      // The vendor's request examples all send `Content-Type: application/json`.
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const method = init.method ?? "GET";
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatEcwidError(
          res.status,
          method,
          url.pathname,
          detail,
          res.headers.get("retry-after"),
        ),
      );
    }
    return res;
  }
}
