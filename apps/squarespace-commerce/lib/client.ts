import type { HookContext } from "@w6w/types";

/**
 * Squarespace Commerce APIs client.
 *
 * Every path, verb, query parameter and body field used by this app was read
 * from Squarespace's own rendered reference pages under
 * `https://developers.squarespace.com/commerce-apis/*` on 2026-09-22, and the
 * handful of facts that decide the shape of this file were confirmed again with
 * live probes against `api.squarespace.com` the same day (`curl` with no
 * credential answers `401 {"type":"AUTHORIZATION_ERROR",…}` on every documented
 * path, including `/1.0/authorization/website`). Nothing here came from a
 * third-party integration directory, and nothing outside the Commerce API
 * surface was touched.
 *
 * ## One host, two version segments — not one
 *
 * The origin is fixed (`https://api.squarespace.com`, declared by every
 * reference page's `servers` block), but the version segment is **not** uniform
 * across this app:
 *
 *   - `/1.0/…` — website profile, store pages, orders, inventory, profiles and
 *     transactions. The pages' own example URLs read
 *     `https://api.squarespace.com/1.0/commerce/orders`.
 *   - `/v2/…` — products only, which Squarespace has versioned separately.
 *
 * The reference pages' navigation also lists the v1 routes under a `/v1/…`
 * slug alias; `/1.0/…` is what their request examples and the live host use, so
 * that is what this app builds.
 *
 * ## The three required headers, and the one this file does NOT set
 *
 *  1. `Authorization: Bearer <API key>` — required on every request, but it is
 *     **not** set here. The runtime routes every outbound request through the
 *     auth method's `sign` hook, which is the only place a credential may go on
 *     the wire; a client that stamped its own header would be a second copy of
 *     the wire format to keep in sync (and the pack's auditor rejects an
 *     `authorization` assignment outside `auth/`).
 *  2. `User-Agent` — Squarespace marks it `required: true` on *every* operation,
 *     with the docs' own placeholder `YOUR_CUSTOM_APP_DESCRIPTION`. A request
 *     without one may still be accepted, but the vendor documents it as
 *     required, so this client sends {@link USER_AGENT} unconditionally.
 *  3. `Content-Type: application/json` — on every request carrying a body.
 *
 * ## `Idempotency-Key` is required on exactly two endpoints
 *
 * `POST /1.0/commerce/orders` (create order) and
 * `POST /1.0/commerce/inventory/adjustments` (adjust stock quantities) both
 * mark `Idempotency-Key` as a required header, and both warn what happens
 * without one: a repeated call short-circuits to "previous operation was
 * successful, no new changes" — a bare `204` with **no error**, which is the
 * worst possible failure mode because it looks like success.
 * {@link SquarespaceClient} stamps one for callers that pass
 * `{ idempotent: true }`. The key is the invocation's own id when the host
 * provides one, so a runtime retry of the *same* step replays rather than
 * duplicates, and a fresh `crypto.randomUUID()` otherwise. It is never a
 * constant.
 *
 * ## Errors: `{type, subtype, message, details, contextId}`
 *
 * Every failure — including an auth rejection — answers the same envelope:
 *
 *     {"type":"AUTHORIZATION_ERROR","subtype":null,
 *      "message":"You are not authorized to do that.","details":null,
 *      "contextId":"…"}
 *
 * `type` is the machine category (`AUTHORIZATION_ERROR`, `INVALID_REQUEST_ERROR`,
 * `CONFLICT`, `TOO_MANY_REQUESTS`, …) and `subtype` the finer code
 * (`MISSING_ARGUMENT`, `SKU_UNAVAILABLE`, `INSUFFICIENT_STOCK`,
 * `PRODUCT_UPDATE_CONFLICT`, …); both are surfaced verbatim by
 * {@link formatSquarespaceError} because the fix differs per code and a
 * flattened "HTTP 400" hides which one was hit.
 *
 * ## The Products "Change" wrapper
 *
 * `POST /v2/commerce/products/{productId}` and
 * `POST /v2/commerce/products/{productId}/variants/{variantId}` are *updates*,
 * but their bodies are not plain objects: every field is wrapped in
 * `{ "present": true, "value": … }` so a caller can distinguish "leave this
 * alone" from "set this to null/empty". {@link change} and
 * {@link changeBody} build that wrapper from the plain params an action
 * declares, so no caller ever writes `{"present": …}` by hand. Nested objects
 * inside a value — notably `pricing`, whose `basePrice`/`onSale`/`salePrice`
 * are themselves `Change` members in the vendor's schema — are passed through
 * as supplied.
 */

/** The one and only API origin. Declared by every reference page's `servers`. */
export const API_BASE = "https://api.squarespace.com";

/** Version segment for website, store pages, orders, inventory, profiles, transactions. */
export const API_V1 = "/1.0";

/** Version segment for products only — Squarespace versions that resource separately. */
export const API_V2 = "/v2";

/**
 * The `User-Agent` this app sends on every request.
 *
 * Squarespace marks the header `required` on every operation and asks for a
 * description of the calling app (`YOUR_CUSTOM_APP_DESCRIPTION` in its own
 * examples). A fixed, identifying value is the documented contract — not a
 * browser string, and not omitted.
 */
export const USER_AGENT = "w6w-squarespace-commerce/1.0";

/**
 * The vendor's documented ceiling for the comma-separated id paths
 * (`/1.0/commerce/inventory/{variantIdCsvs}`, `/v2/commerce/products/{productIdCsvs}`,
 * `/1.0/commerce/transactions/{documentIds}`): "up to 50".
 */
export const MAX_CSV_IDS = 50;

/** Squarespace's general ceiling; the Create-order key limit is far lower. */
export const RATE_LIMIT_PER_MINUTE = 300;

/** Create order's own ceiling when an API key (rather than OAuth) authenticates the call. */
export const CREATE_ORDER_RATE_LIMIT_PER_HOUR = 100;

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /**
   * Stamp a fresh `Idempotency-Key`. Set only by the two endpoints Squarespace
   * marks the header required on — see this file's header.
   */
  idempotent?: boolean;
}

/**
 * The vendor's failure envelope, in the exact shape observed live.
 *
 * `details` is typed loosely on purpose: it carries a different object per
 * subtype, and guessing at its members would be inventing a field.
 */
export interface SquarespaceErrorBody {
  type?: string;
  subtype?: string | null;
  message?: string;
  details?: unknown;
  contextId?: string;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Parse the vendor's error envelope. Returns `undefined` for an empty or
 * non-JSON body (a 404 from a proxy, a bodyless 204 replay) — the caller
 * decides what an unreadable body means.
 */
export function parseSquarespaceError(text: string): SquarespaceErrorBody | undefined {
  if (!text || !text.trim()) return undefined;
  try {
    const body = JSON.parse(text) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
    return body as SquarespaceErrorBody;
  } catch {
    return undefined;
  }
}

/**
 * One line a human can act on, preferring the vendor's own `type`/`subtype`.
 *
 * `type` and `subtype` are surfaced verbatim because the fix differs per code:
 * `INSUFFICIENT_STOCK` and `SKU_UNAVAILABLE` both arrive as "the write failed"
 * to a client that flattens them into "HTTP 400".
 */
export function formatSquarespaceError(
  status: number,
  method: string,
  path: string,
  detail: string,
): string {
  const err = parseSquarespaceError(detail);
  const code = [err?.type, err?.subtype].filter(Boolean).join("/");
  const parts = [`Squarespace ${status}${code ? ` ${code}` : ""} for ${method} ${path}`];
  if (err?.message) parts.push(err.message);
  else if (detail.trim()) parts.push(truncate(detail));
  if (err?.details !== undefined && err?.details !== null) {
    parts.push(`details: ${truncate(JSON.stringify(err.details), 300)}`);
  }
  if (err?.contextId) parts.push(`contextId ${err.contextId}`);
  if (status === 429) {
    parts.push(
      `rate limited — Squarespace allows ${RATE_LIMIT_PER_MINUTE} requests/minute, and ` +
        `${CREATE_ORDER_RATE_LIMIT_PER_HOUR}/hour on Create order with an API key; retry with ` +
        "backoff",
    );
  }
  return truncate(parts.join(": "), 1000);
}

/**
 * Turn caller-supplied ids into the comma-separated path segment the vendor's
 * `{…Csvs}` and `{documentIds}` routes take.
 *
 * Accepts one comma-separated string (what a form field collects) or an array,
 * trims each id, drops blanks, percent-escapes each one individually (so the
 * commas survive as separators) and enforces the documented ceiling rather
 * than letting the vendor answer `400 … exceed the maximum of 50`.
 */
export function csvIds(
  value: unknown,
  options: { max?: number; label?: string } = {},
): string {
  const { max, label = "ids" } = options;
  const raw = Array.isArray(value) ? value : String(value ?? "").split(",");
  const ids = raw.map((v) => String(v ?? "").trim()).filter(Boolean);
  if (ids.length === 0) {
    throw new Error(`${label} is required — pass at least one id`);
  }
  if (max !== undefined && ids.length > max) {
    throw new Error(
      `${label}: Squarespace accepts at most ${max} comma-separated ids per request ` +
        `(received ${ids.length})`,
    );
  }
  return ids.map((id) => encodeURIComponent(id)).join(",");
}

/**
 * One `{ "present": true, "value": … }` member, or `undefined` when the caller
 * left the field unset (which is how "leave it unchanged" is expressed).
 */
export interface Change<T> {
  present: true;
  value: T;
}

/** See {@link Change}. `undefined` in, `undefined` out. */
export function change<T>(value: T | undefined): Change<T> | undefined {
  if (value === undefined) return undefined;
  return { present: true, value };
}

/**
 * The Products update body builder.
 *
 * Squarespace's `UpdateProductRequest`/update-variant bodies wrap every field
 * in the Change convention so `null`/`""` can be expressed distinctly from
 * "not supplied". Actions declare plain params and hand them here; a field the
 * caller left alone is simply absent from the body, and a field they set — even
 * to `""` or `null` — is present with that value. `false` survives too: a
 * dropped `false` would make `isVisible: false` impossible to express.
 */
export function changeBody(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    out[key] = { present: true, value };
  }
  return out;
}

/**
 * A `json` param as the host hands it over: already parsed, or the string the
 * caller typed. Absence yields `undefined`.
 */
export function jsonParam<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Same, but absence is an error. */
export function requireJson<T>(value: unknown, label: string): T {
  const parsed = jsonParam<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/** Drop the keys a caller left unset, so an omitted field is absent rather than `null`. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * It never sets an `Authorization` header (see this file's header), and it
 * always sends {@link USER_AGENT}. A `204` — `fulfillOrder`, `adjustInventory`,
 * both deletes — parses to `undefined`, which is the whole response.
 */
export class SquarespaceClient {
  constructor(private ctx: HookContext) {}

  /** A `GET`, parsed as JSON. */
  get<T>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.json<T>(path, { method: "GET", query });
  }

  /** A `POST` with a JSON body. `idempotent: true` stamps an `Idempotency-Key`. */
  post<T>(
    path: string,
    body: unknown,
    options: { idempotent?: boolean } = {},
  ): Promise<T> {
    return this.json<T>(path, { method: "POST", body, idempotent: options.idempotent });
  }

  /** A `DELETE` (both product deletes answer `204`). */
  delete<T = void>(path: string): Promise<T> {
    return this.json<T>(path, { method: "DELETE" });
  }

  /** Parse the response body as JSON. A `204` or an empty body yields `undefined`. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * The idempotency key for one call.
   *
   * The invocation id when the host issued one — that is what makes a runtime
   * retry of the same step replay instead of duplicating — and a fresh UUID
   * otherwise. Never a constant, which is what the vendor's warning about a
   * silently-skipped replay exists to prevent.
   */
  idempotencyKey(): string {
    return this.ctx.invocation?.invocationId ?? crypto.randomUUID();
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        // Products' `type` filter is documented as a REPEATED key ...
        for (const item of value) {
          if (item === undefined || item === null || item === "") continue;
          url.searchParams.append(key, String(item));
        }
        continue;
      }
      // ... whereas orders' `paymentStates` is one comma-separated value, which
      // the action itself joins before it gets here.
      url.searchParams.set(key, String(value));
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      "user-agent": USER_AGENT,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    if (options.idempotent) headers["idempotency-key"] = this.idempotencyKey();

    const method = init.method ?? "GET";
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatSquarespaceError(res.status, method, url.pathname, detail));
    }
    return res;
  }
}
