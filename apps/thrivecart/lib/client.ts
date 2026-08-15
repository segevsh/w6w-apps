import type { HookContext } from "@w6w/types";

/**
 * ThriveCart REST client.
 *
 * Everything in this module was verified on 2026-08-15 against ThriveCart's
 * published Postman collection
 * (`https://apidocs.thrivecart.com/api/collections/13408532/TVejhANr`,
 * 93,209 bytes, 33 documented requests) plus live probes against
 * `thrivecart.com` the same day, and cross-checked against the vendor's own
 * open-source PHP SDK (`github.com/thrivecart/php-api`, `src/Api.php`).
 *
 * ## The base host is `thrivecart.com`, not `api.thrivecart.com`
 *
 * `https://api.thrivecart.com/api/external/ping` 404s — there is no `api.`
 * subdomain. Every request in the collection targets `https://thrivecart.com`
 * with an `/api/external` prefix, and the PHP SDK hard-codes exactly that:
 * `public static $baseUri = 'https://thrivecart.com'; public $endpoint =
 * '/api/external';`. This is a single fixed host for every account — unlike
 * a merchant's own storefront (`https://<account>.thrivecart.com/`, visible
 * in `ping`'s response), the API itself is not addressed per-tenant, so
 * nothing here needs a Connection-supplied host.
 *
 * ## Bare bodies, not an envelope
 *
 * Most endpoints answer the entity (or array of entities) directly — no
 * `{"data": …}` wrapper. `transactions` and `affiliates` search responses are
 * the one shape with structure: `{ <items key>: [...], meta: { total,
 * results } }`.
 *
 * ## Two authentication-error shapes, and which one a real credential hits
 *
 * The collection documents exactly one 401 shape:
 * `{"error": "invalid_token", "error_description": "..."}`. Live probing on
 * 2026-08-15 found that shape is real, but it is not the one a genuinely
 * revoked or mistyped credential produces:
 *
 *  - No `Authorization` header at all -> `{"error": "auth.missing"}`.
 *  - A bearer value containing a hyphen -> `{"error": "auth.invalid"}` or
 *    `{"error": "auth.incorrect"}` (deterministic per value, cause unknown —
 *    ThriveCart is closed-source beyond the SDK).
 *  - A bearer value with no hyphen at all -> the documented
 *    `{"error": "invalid_token", "error_description": "..."}`, with a
 *    `WWW-Authenticate: Bearer …` header the other two shapes never send.
 *
 * That third bucket looks like the one to design around — it is the
 * documented shape, after all — except ThriveCart's own API-key form field
 * (`thrivecart/api-demo`'s `apikey_example.php`) prompts for
 * `XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX`: real access tokens are hyphenated.
 * A real revoked or mistyped token therefore lands in the *undocumented*
 * `auth.*` bucket, not the one the collection shows. `formatThriveCartError`
 * and the auth `test` hook (`auth/api-token.ts`) both read `error` generically
 * rather than switching on the one code the docs happen to publish.
 *
 * ## No rate-limit or quota signal anywhere
 *
 * Neither `apidocs.thrivecart.com` nor `developers.thrivecart.com` mentions a
 * rate limit, and no response observed during verification — success or
 * error — carried an `X-RateLimit-*` header or any other quota field. See
 * `health/quota.ts`.
 */

/** The one and only API origin. `api.thrivecart.com` does not exist. */
export const API_BASE = "https://thrivecart.com";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/api/external";

export type QueryValue = string | number | boolean | undefined | null;
export type FormValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /**
   * `application/x-www-form-urlencoded` — every documented POST body except
   * `subscribe` and `customerEmailUpdate`. An array value is sent as a
   * repeated `key[]` field: the only array field the collection shows in
   * full (`tags[]` on Create Student) is written that way, and it is the
   * standard PHP convention for turning a form post into `$_POST[key]` array
   * — a bare repeated key without brackets keeps only the last value in
   * PHP's default parser. `product_ids` on the affiliate endpoints is
   * documented without brackets in the collection, but nothing shows how the
   * server actually parses it, so this app follows the one convention it can
   * see in full rather than guessing a second one.
   */
  form?: Record<string, FormValue>;
  /** `application/json` — `subscribe` and `customerEmailUpdate` only. */
  json?: unknown;
  /**
   * `X-TC-Mode: live | test`. Documented as optional on several endpoints;
   * the PHP SDK in fact sends it on every request (`Api::$mode`, default
   * `'live'`), so it is offered on every action here rather than only the
   * ones the collection happened to show it on. Omitted entirely when unset
   * — never sent as an empty string.
   */
  mode?: string;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

function encodeForm(body: Record<string, FormValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(`${key}[]`, String(item));
      continue;
    }
    params.append(key, String(value));
  }
  return params.toString();
}

/** Keep an error message readable — a validation body can ramble. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

interface ThriveCartErrorBody {
  error?: string;
  error_description?: string;
}

/**
 * Turn ThriveCart's error body into one actionable line.
 *
 * `error` is sometimes a short dot-namespaced code (`auth.invalid`,
 * `invalid_token`) and sometimes a full English sentence
 * (`"You must provide a valid order ID."`) — there is no single enum to
 * switch on, so both are surfaced verbatim rather than mapped through a
 * lookup table that would silently drop whichever shape it wasn't written
 * for. See the module docs for the two auth-error shapes specifically.
 */
export function formatThriveCartError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ThriveCartErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ThriveCartErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const code = parsed?.error;
  if (!code) return `ThriveCart ${status} for ${method} ${path}: ${truncate(raw)}`;

  const detail = parsed?.error_description ? `${code}: ${parsed.error_description}` : code;
  return truncate(`ThriveCart ${status} for ${method} ${path} — ${detail}`, 1000);
}

/** Path-escape a caller-supplied resource id. */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

export class ThriveCartClient {
  constructor(private ctx: HookContext) {}

  get<T = unknown>(path: string, options: Omit<RequestOptions, "method"> = {}): Promise<T> {
    return this.send<T>(path, { ...options, method: "GET" });
  }

  post<T = unknown>(path: string, options: Omit<RequestOptions, "method"> = {}): Promise<T> {
    return this.send<T>(path, { ...options, method: "POST" });
  }

  private async send<T>(path: string, options: RequestOptions): Promise<T> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    if (options.mode) headers["x-tc-mode"] = options.mode;

    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.json !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.json);
    } else if (options.form) {
      headers["content-type"] = "application/x-www-form-urlencoded";
      init.body = encodeForm(options.form);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatThriveCartError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
