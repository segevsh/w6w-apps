import type { HookContext } from "@w6w/types";

/**
 * Splitwise API v3.0 REST client.
 *
 * Everything in this module was verified on 2026-08-11 against Splitwise's own
 * OpenAPI 3.0.1 document — the one `https://dev.splitwise.com/` (630,436 bytes,
 * md5 `0bd7a58e43c4…`) embeds in its Redoc `__redoc_state` payload, whose
 * `info.version` is `3.0.0` and whose single `servers[0].url` is
 * `https://secure.splitwise.com/api/v3.0` — plus live unauthenticated probes
 * against that host. Nothing here came from a third-party integration
 * directory or from one of the community SDKs the vendor links to.
 *
 * ## The one rule that matters: `res.ok` is not success
 *
 * Splitwise answers **HTTP 200 with a populated `errors` object** when a write
 * fails, and its own reference says so in six places, verbatim:
 *
 *   > **Note**: 200 OK does not indicate a successful response. The operation
 *   > was successful only if `errors` is empty.
 *
 *   > **Note**: 200 OK does not indicate a successful response. You must check
 *   > the `success` value of the response.
 *
 * So a client that trusts the status code silently reports a rejected expense
 * as created. {@link SplitwiseClient.request} therefore inspects **every** 200
 * body for both failure channels before returning, and there is no code path in
 * this app that reaches a response without going through it.
 *
 * ## `errors` has three different shapes, and one of them is falsy-safe-looking
 *
 * Reading the vendor's schemas end to end, the failure payload is any of:
 *
 *  - `{"error": "Invalid API Request: you are not logged in"}` — a **string**
 *    under a **singular** key. This is the 401 body and only the 401 body.
 *  - `{"errors": {"base": ["Unrecognized parameter `bad_parameter`"]}}` — the
 *    400/403/404 body, and the 200 soft-failure body: an object of
 *    field name → array of messages. `base` is the catch-all field.
 *  - `{"errors": ["…"]}` — a bare **array** of strings, which is what
 *    `undelete_group` declares.
 *
 * The third is the trap: `if (body.errors)` is `true` for `[]` *and* for `{}`,
 * so the naive check reports every successful undelete as a failure, while
 * `if (body.errors?.base)` misses the array form entirely and reports every
 * failed one as a success. {@link collectErrors} flattens all three to
 * `string[]` and emptiness is decided on that.
 *
 * ## Errors carry no credential
 *
 * Messages are built from the vendor's own prose plus the method and path. The
 * credential never enters this module — `auth/api-key.ts` `sign` is the only
 * code that sees it.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://secure.splitwise.com";

/**
 * The version prefix, split from the origin because the OAuth endpoints sit at
 * the host root rather than under it (see `auth/api-key.ts`).
 *
 * `v3.0` is the only live version. Measured 2026-08-11:
 * `/api/v1.0/get_current_user`, `/api/v2.0/…` and `/api/v3.1/…` all return the
 * site's HTML 404 (3,085 bytes), byte-identical to a nonsense path;
 * `/api/v3.0/…` returns a JSON 401. Nothing in the reference is marked
 * `deprecated`, and a scan of the whole document for
 * `deprecat|depreciat|sunset|retire|end of life|will be removed|no longer
 * supported` matches **zero** times — this is the version whose page carries no
 * deprecation banner because it is the only version there is.
 */
export const API_PREFIX = "/api/v3.0";

/**
 * The two endpoints that answer **without any credential**.
 *
 * Measured 2026-08-11: `GET /api/v3.0/get_currencies` and
 * `GET /api/v3.0/get_categories` each returned HTTP 200 with their full payload
 * and no `Authorization` header at all, while every other endpoint in this
 * API's surface returned 401.
 *
 * Recorded here, in the module that knows what the API is, rather than in
 * `auth/` — which lets a test assert that neither name appears anywhere in the
 * auth or health modules. A probe against a public endpoint would pass for a
 * Connection whose credential never got attached, which is the single most
 * dangerous way to pick a liveness check.
 */
export const PUBLIC_ENDPOINTS = ["/get_currencies", "/get_categories"] as const;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: Record<string, unknown>;
}

/**
 * Every documented failure payload, in one union. `errors` is genuinely
 * polymorphic in the vendor's own schemas — see the module doc.
 */
interface SplitwiseErrorBody {
  error?: unknown;
  errors?: unknown;
  success?: unknown;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful. */
export function compact(
  obj: Record<string, QueryValue>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Path-escape a caller-supplied numeric id.
 *
 * Every `{id}` in this API is documented as an integer, so anything else is a
 * mistake worth catching before it becomes a request — and escaping alone would
 * not stop `1/../../delete_group/2` from being *sent*, only from being one
 * segment.
 */
export function encodeId(id: number | string, label: string): string {
  const raw = String(id ?? "").trim();
  if (!/^\d+$/.test(raw)) throw new Error(`${label} must be a positive integer id, got "${raw}"`);
  return raw;
}

/**
 * Flatten every documented failure shape to a list of human messages.
 *
 * Returns `[]` when the body carries no failure — which, deliberately, is also
 * what an *empty* `errors` object or array produces, because that is what the
 * vendor sends on success. See the module doc for why the obvious truthiness
 * check gets this exactly backwards.
 */
export function collectErrors(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const b = body as SplitwiseErrorBody;
  const out: string[] = [];

  // Singular `error`: a bare string. Only the 401 uses it.
  if (typeof b.error === "string" && b.error.trim() !== "") out.push(b.error.trim());

  const errors = b.errors;
  if (typeof errors === "string" && errors.trim() !== "") {
    out.push(errors.trim());
  } else if (Array.isArray(errors)) {
    // `undelete_group`'s shape: a bare array of strings.
    for (const e of errors) if (typeof e === "string" && e.trim() !== "") out.push(e.trim());
  } else if (errors && typeof errors === "object") {
    // The common shape: field -> messages. `base` is the catch-all field, but
    // `add_user_to_group` and `create_friends` key by the offending field, so
    // the field name is kept when it is anything else.
    for (const [field, value] of Object.entries(errors as Record<string, unknown>)) {
      const messages = Array.isArray(value) ? value : [value];
      for (const m of messages) {
        if (typeof m !== "string" || m.trim() === "") continue;
        out.push(field === "base" ? m.trim() : `${field}: ${m.trim()}`);
      }
    }
  }
  return out;
}

/**
 * Did a 200 response actually succeed?
 *
 * Two independent channels, both documented, and an endpoint may use either:
 *
 *  1. `errors` is non-empty — `create_expense`, `update_expense`,
 *     `create_friends`, `add_user_to_group`, `remove_user_from_group`,
 *     `delete_friend`, `undelete_group`.
 *  2. `success` is present and not `true` — `delete_group`, `delete_expense`,
 *     `undelete_expense`, and the same set again.
 *
 * `success` is only consulted when the key is present: no read endpoint returns
 * it, and treating its absence as failure would reject every successful read.
 */
export function softFailure(body: unknown): string[] | undefined {
  if (!body || typeof body !== "object") return undefined;
  const errors = collectErrors(body);
  if (errors.length > 0) return errors;
  const b = body as SplitwiseErrorBody;
  if ("success" in b && b.success !== true) {
    return [`Splitwise reported success=${JSON.stringify(b.success)} with no error detail`];
  }
  return undefined;
}

/**
 * Turn a failure into one actionable line.
 *
 * The status is kept alongside the vendor's prose because the two say different
 * things: 403 is "your credential is fine, this record is not yours", 404 is
 * "no such record", and 400 is "the request was malformed" — three different
 * fixes that a flattened "Splitwise error" hides. A 200 arrives here too, via
 * {@link softFailure}, and is labelled as such so nobody chases an HTTP problem
 * that never happened.
 */
export function formatSplitwiseError(
  status: number,
  method: string,
  path: string,
  messages: string[],
  raw: string,
): string {
  const detail = messages.length > 0 ? messages.join("; ") : truncate(raw) || "no error detail";
  const label = status === 200
    ? `Splitwise rejected ${method} ${path} with HTTP 200 (the documented soft-failure channel)`
    : `Splitwise ${status} for ${method} ${path}`;
  const hint = status === 401
    ? " — Splitwise returns this identical body for a missing, empty, malformed and revoked " +
      "credential alike, so it does not distinguish them"
    : status === 429
    ? " — Splitwise publishes no rate-limit headers and no numeric limits; back off and retry"
    : "";
  return truncate(`${label}: ${detail}${hint}`, 1000);
}

export class SplitwiseClient {
  constructor(private ctx: HookContext) {}

  /**
   * Perform a request and return the parsed body, having already established
   * that it succeeded on **both** channels — HTTP status and the vendor's
   * in-band `errors` / `success`.
   */
  async request<T = Record<string, unknown>>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(compact(options.query ?? {}))) {
      url.searchParams.set(k, String(v));
    }

    const method = (options.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const raw = await res.text().catch(() => "");

    let parsed: unknown = undefined;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch { /* an HTML body — handled below */ }
    }

    if (!res.ok) {
      throw new Error(
        formatSplitwiseError(res.status, method, url.pathname, collectErrors(parsed), raw),
      );
    }

    // A JSON API that suddenly answers HTML is an edge error page or a login
    // redirect, not a result. Splitwise's own 404 for an unrouted path is
    // exactly that, served with HTTP 404 — but a proxy in front can turn it
    // into a 200, and returning `undefined` from a "successful" read is worse
    // than saying so.
    if (raw && parsed === undefined) {
      throw new Error(
        `Splitwise returned a non-JSON body for ${method} ${url.pathname}: ${truncate(raw, 200)}`,
      );
    }

    const soft = softFailure(parsed);
    if (soft) {
      throw new Error(formatSplitwiseError(200, method, url.pathname, soft, raw));
    }

    return (parsed ?? {}) as T;
  }
}

/**
 * Read one key out of a response envelope.
 *
 * Every endpoint in this API wraps its payload in a single named key —
 * `{"user": …}`, `{"groups": […]}`, `{"expenses": […]}` — and there is no
 * generic `data` envelope, so the key is named at each call site rather than
 * guessed here.
 */
export function pick<T>(body: Record<string, unknown>, key: string, fallback: T): T {
  const value = body?.[key];
  return value === undefined || value === null ? fallback : value as T;
}
