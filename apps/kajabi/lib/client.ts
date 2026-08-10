import type { HookContext } from "@w6w/types";

/**
 * Kajabi Public API v1 client.
 *
 * ## Which API — and why the catalogue's link was the wrong one
 *
 * The candidate entry for this app cited
 * `help.kajabi.com/hc/en-us/articles/360037178613` as "API docs". That article
 * is **not** developer documentation: it is a Zapier walkthrough describing
 * Kajabi's *inbound* and *outbound* webhooks, gated to the Growth and Pro
 * plans. Building from it would have produced a trigger-shaped app with no
 * Actions in it — and this pack has no trigger surface.
 *
 * That was the historical state. It is no longer the current one. Kajabi
 * shipped a genuine, versioned, machine-readable REST API, announced with the
 * September 2025 Pro plan, and publishes it at `developers.kajabi.com` (a
 * Mintlify site, sources at `github.com/Kajabi/public_api_docs`). Its OpenAPI
 * document is generated from the Kajabi application itself — the repo's README
 * says the file "is automatically generated from the main Kajabi application
 * and should not be edited directly", which makes it the authoritative
 * description of the live surface rather than hand-written prose that can drift.
 *
 * Every host, path, parameter, enum and body shape in this app is transcribed
 * from that document (`openapi.yaml`, `openapi: 3.1.1`, `info.version: 1.1.0`,
 * 12,530 lines, fetched 2026-08-03) or verified on the wire against
 * `api.kajabi.com` on the same date. Nothing here is recalled.
 *
 * ## One fixed host — no per-tenant base URL, no wildcard
 *
 * Kajabi sites are per-tenant and each has its own vanity domain
 * (`yoursite.mykajabi.com`, or a custom domain). It would be reasonable to
 * expect the API to follow the site, the way `wordpress` and `grist` do, which
 * would force a wildcard allowlist plus a `dependency` health check.
 *
 * It does not. The spec states the server once, globally: "Server URL
 * `https://api.kajabi.com`", "Endpoint paths are prefixed with `/v1`". There is
 * no `servers:` list of alternates and no templated host anywhere in the
 * document. Confirmed on the wire 2026-08-03 —
 * `GET https://api.kajabi.com/v1/version` answers 200 with
 * `{"meta":{"title":"Kajabi API V1","version":"1.1.0"},…}` for an
 * unauthenticated caller with no site selector of any kind.
 *
 * The tenant is instead carried **inside** the credential and, where an account
 * owns more than one site, by an explicit `filter[site_id]` query parameter
 * (see `siteFilterParam` in `lib/params.ts`). So `w6w.network.allow` is the
 * single literal `api.kajabi.com`, in the spirit of `quickbase` rather than
 * `wordpress`: narrow allowlist, tenant passed as data.
 *
 * ## The API is JSON:API, and that is load-bearing
 *
 * `/v1/version` advertises it: `"jsonapi":{"version":"v1.1","specification":
 * "https://jsonapi.org/format/"}`. Three consequences run through this file:
 *
 *  - **Content type.** Resource endpoints answer `application/vnd.api+json`,
 *    and write bodies must be sent as that type, not `application/json`. This
 *    client sets both `accept` and `content-type` accordingly.
 *  - **Envelope.** Reads come back as `{ data, included?, meta?, links? }`,
 *    with the resource's fields under `data.attributes` rather than at the top
 *    level. `lib/params.ts` declares outputs against that shape.
 *  - **Bracketed query keys.** Pagination is `page[number]` / `page[size]`,
 *    filters are `filter[...]`, sparse fieldsets are `fields[<type>]`. Those
 *    brackets are part of the key and must survive into the query string; see
 *    `request` below.
 *
 * ## Failure is signalled honestly, so `res.ok` is enough
 *
 * The dominant bug class in this pack is a vendor that answers 2xx for a
 * failure. Kajabi was probed for it specifically on 2026-08-03 rather than
 * assumed, and it behaves correctly:
 *
 *   | Request                                             | HTTP | Body                                     |
 *   | --------------------------------------------------- | ---- | ---------------------------------------- |
 *   | `GET /v1/me`, no `Authorization`                    | 401  | `{"errors":[{"status":"401","title":"Unauthorized",…}]}` |
 *   | `GET /v1/me`, `Authorization: Bearer bogus_zzz…`    | 401  | identical envelope                        |
 *   | `POST /v1/oauth/token`, bogus client id + secret    | 401  | `{"error":"Invalid client credentials"}`  |
 *   | `POST /v1/oauth/token`, no params at all            | 400  | —                                         |
 *   | `GET /v1/totally_bogus_zzz`                         | 404  | `text/html` Kajabi 404 page               |
 *
 * Anonymous access is a real 401, not a 200 with an error object (contrast
 * `grist` and Circle's v1). A bad credential is a real 401, not a 200
 * (contrast `manychat`). So this client can trust the status line, and does —
 * but it still reads the body on failure to build the message, because the
 * JSON:API `errors[].detail` string is the part an operator can act on.
 *
 * Note the last row: an unknown path answers **HTML**, not JSON. `errorMessage`
 * therefore must not assume a JSON error body, and does not.
 *
 * ## What this client does NOT do
 *
 * It never sets `Authorization`. That header is stamped by
 * `auth/client-credentials.ts`'s `sign` hook, the only place a token is
 * visible. Actions reach the network exclusively through here, and here
 * exclusively through `ctx.fetch` — never global `fetch`, never `Deno.*`.
 */

/** The one host this app talks to. Mirrored by `w6w.network.allow`. */
export const API_HOST = "api.kajabi.com";

/** Base origin. The `/v1` prefix is added by `API_URL`, and by `TOKEN_URL`. */
export const API_ORIGIN = `https://${API_HOST}`;

/** Base URL every action path hangs off. */
export const API_URL = `${API_ORIGIN}/v1`;

/** OAuth2 token endpoint. Used only by the auth hooks. */
export const TOKEN_URL = `${API_URL}/oauth/token`;

/** OAuth2 revocation endpoint. Used only by the auth hooks. */
export const REVOKE_URL = `${API_URL}/oauth/revoke`;

/**
 * The JSON:API media type. Kajabi's resource endpoints both emit and expect it.
 *
 * The OAuth endpoints are the exception — they are plain
 * `application/x-www-form-urlencoded` in and `application/json` out, which is
 * why `auth/client-credentials.ts` builds its requests by hand instead of
 * going through `KajabiClient`.
 */
export const JSON_API_TYPE = "application/vnd.api+json";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Bracketed JSON:API keys (`filter[site_id]`) are passed through verbatim. */
  query?: Record<string, QueryValue>;
  /** A complete JSON:API document — `{ data: … }`. Built by `resource*` below. */
  body?: Record<string, unknown>;
}

/**
 * Treat a blank form field as absent.
 *
 * A `string` param the user left empty arrives as `""`. Forwarding that as
 * `filter[search]=` would ask Kajabi to match the empty string rather than to
 * skip the filter.
 */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/**
 * Drop keys the caller left unset, so a PATCH only touches what was filled in.
 *
 * `undefined` and `""` both mean "not supplied" for a Kajabi attribute. `null`
 * deliberately **survives**: several `contacts_attributes` fields are typed
 * `["string","null"]` in the spec, so `null` is a real value there meaning
 * "clear this field" — collapsing it into "absent" would make it impossible to
 * blank a phone number. `false` and `0` survive for the same reason: on
 * `subscribed` and on the revenue filters they are meaningful values.
 *
 * No action currently passes `null` (no param type produces one), but the rule
 * is encoded here rather than in each caller so that adding a clear-this-field
 * param later does not require re-deriving it.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Parse a JSON param a workflow author may have supplied as a string.
 *
 * Used only where Kajabi accepts an open-ended attribute bag whose legal keys
 * depend on the site's own configuration (`custom_1`…`custom_3`, whose support
 * the spec says "depends on custom fields of a site"). Enumerating those as
 * fixed params would be guessing at another tenant's schema.
 */
export function jsonObject(
  v: unknown,
  label: string,
): Record<string, unknown> | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "object") return v as Record<string, unknown>;
  if (typeof v !== "string") throw new Error(`${label} must be a JSON object`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(v);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/**
 * A JSON:API resource identifier — `{ id, type }`, both required by the spec's
 * `resource_identifier` schema.
 *
 * Kajabi's relationship endpoints take an **array** of these, even to add a
 * single member, so `resourceIdentifiers` is what callers actually use. Ids are
 * stringified because JSON:API requires `id` to be a string and Kajabi's own
 * examples send it quoted, even though every id in this API is numeric.
 */
export function resourceIdentifier(
  id: string | number,
  type: string,
): { id: string; type: string } {
  return { id: String(id), type };
}

/**
 * Split a comma-separated form field into a JSON:API identifier array.
 *
 * The relationship routes (`/contacts/{id}/relationships/tags`, `…/offers`) are
 * declared `type: array` of `resource_identifier`, so batching is the API's own
 * intended shape rather than a convenience this app invented — three tags is
 * one request, not three.
 *
 * Returns `undefined` rather than `[]` for an input with no usable id. An empty
 * array is a *value* on the PATCH ("replace") routes — it would clear the whole
 * relationship — and a user who typed whitespace did not ask for that.
 */
export function identifierList(
  v: string | undefined,
  type: string,
): Array<{ id: string; type: string }> | undefined {
  if (!v) return undefined;
  const ids = v.split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length ? ids.map((id) => resourceIdentifier(id, type)) : undefined;
}

/**
 * Turn a user-supplied `{ "key": value }` object into `filter[key]=value` pairs.
 *
 * ## Why an escape hatch exists at all
 *
 * `GET /v1/contacts` and `GET /v1/customers` each declare **75+** `filter[…]`
 * parameters — every one documented, from `filter[has_active_product_id]` to
 * `filter[no_dropped_email_broadcast_id]`. Rendering 75 optional form fields
 * would make the action unusable, and picking a favourite dozen would silently
 * put the other sixty out of reach of a workflow author who can read Kajabi's
 * own parameter table.
 *
 * So the actions surface the filters that carry the common cases as real,
 * labelled params, and this passes anything else through. It is a documented
 * surface being forwarded, not an undocumented one being discovered — the
 * distinction that separates this from reaching for a private endpoint.
 *
 * ## Why the key is validated
 *
 * The key is interpolated into a query parameter *name*, so it is checked
 * against `[A-Za-z0-9_]+` and rejected otherwise. Without that, a key
 * containing `]` or `&` could close the bracket and inject a second parameter —
 * a caller aiming at `filter[x]` could write `site_id]&fields[contacts` and
 * reach a different parameter entirely. Rejecting loudly beats silently
 * encoding something the author did not mean.
 *
 * Nested values are JSON-encoded rather than dropped, so a mistake surfaces as
 * a Kajabi 400 the author can read rather than as a filter that vanished.
 */
export function extraFilters(v: unknown, label = "Filters"): Record<string, QueryValue> {
  const obj = jsonObject(v, label);
  if (!obj) return {};
  const out: Record<string, QueryValue> = {};
  for (const [k, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === "") continue;
    if (!/^[A-Za-z0-9_]+$/.test(k)) {
      throw new Error(
        `${label}: "${k}" is not a valid Kajabi filter name (letters, digits and underscores only)`,
      );
    }
    out[`filter[${k}]`] = typeof value === "object" ? JSON.stringify(value) : value as QueryValue;
  }
  return out;
}

/**
 * Drop unset entries from a query object *before* it is spread over another.
 *
 * ## Why this is not the same as letting `request` drop them
 *
 * `KajabiClient.request` already skips `undefined`/`null`/`""` values, so for a
 * plain query object this helper changes nothing. It matters in exactly one
 * place: the two actions that merge `extraFilters` with their own named params.
 *
 * Spreading `{ ...extraFilters(input.filters), "filter[x]": input.x }` puts the
 * key `filter[x]` in the result **even when `input.x` is `undefined`** — object
 * spread overwrites by key, not by definedness. The undefined then shadows
 * whatever the escape hatch supplied, and `request` drops the key entirely. Net
 * effect: naming a filter as a form field silently disables that same filter
 * when passed through `Additional filters`, and it fails *quietly* — the
 * workflow gets an unfiltered result set rather than an error.
 *
 * Running the explicit half through this first means only filters the user
 * actually filled in participate in the override, which preserves the intended
 * precedence (a real param beats the hatch) without the shadowing.
 */
export function definedQuery(q: Record<string, QueryValue>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/**
 * Kajabi's two error envelopes.
 *
 * Resource endpoints use the JSON:API array form, confirmed on the wire:
 * `{"errors":[{"status":"401","source":null,"title":"Unauthorized","detail":"The
 * request is missing an Authorization token, or token is invalid/has expired…"}]}`.
 *
 * The OAuth endpoints use a flat OAuth2-style form instead:
 * `{"error":"Invalid client credentials"}`. Both are handled, because an app
 * that only understood the first would render a token failure as an empty
 * message — exactly when the operator most needs to be told what went wrong.
 */
interface KajabiErrorDocument {
  errors?: Array<{ status?: string; title?: string; detail?: string; code?: string }>;
  error?: string;
  error_description?: string;
}

/**
 * Pull the human half out of an error body, falling back to a truncated slice
 * of the raw text.
 *
 * Exported so the auth hooks, the health checks and the unit tests read errors
 * exactly the way the client does. No credential ever enters this module, so
 * nothing it returns can carry credential material — a property the test suite
 * pins rather than assumes.
 *
 * The HTML fallback matters here: `GET /v1/totally_bogus_zzz` returns a
 * `text/html` Kajabi 404 page, so a `JSON.parse` that threw would otherwise
 * lose the status entirely. The slice cap keeps a full HTML page out of a
 * workflow's error string.
 */
export function errorMessage(text: string): string {
  if (!text) return "";
  try {
    const body = JSON.parse(text) as KajabiErrorDocument;
    const first = body.errors?.[0];
    if (first) {
      const parts = [first.title, first.detail].filter((s): s is string => !!s);
      if (parts.length) return parts.join(": ");
    }
    if (typeof body.error === "string" && body.error) {
      return body.error_description ? `${body.error}: ${body.error_description}` : body.error;
    }
  } catch {
    // Not JSON — Kajabi serves an HTML 404 page for unknown paths.
  }
  return text.slice(0, 400);
}

export class KajabiClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // `URLSearchParams` percent-encodes `[` and `]`. That is correct and
      // Rails decodes it — the brackets are part of the key name, not
      // structure, so no manual assembly is needed here.
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: JSON_API_TYPE };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      // JSON:API requires the vendor media type on writes. Sending plain
      // `application/json` risks a 415 from a strict JSON:API server.
      headers["content-type"] = JSON_API_TYPE;
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = errorMessage(await res.text().catch(() => ""));
      throw new Error(
        `Kajabi ${res.status} ${res.statusText} for ${init.method} ${url.pathname}` +
          (detail ? `: ${detail}` : ""),
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
