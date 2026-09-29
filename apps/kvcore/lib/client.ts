import type { HookContext } from "@w6w/types";

/**
 * kvCORE Public API V2 REST client (`https://api.kvcore.com/v2/public/...`).
 *
 * Everything in this module was verified on 2026-09-29 against the vendor's
 * own OpenAPI 3.1 document — embedded server-side-rendered into every
 * `developer.insiderealestate.com/publicv2/reference/*` page (project
 * "kvCORE Public API V2", subdomain `testire`) — plus a live, unauthenticated
 * probe against `api.kvcore.com`.
 *
 * ## Two APIs live at that developer hub. This app targets the one that works
 *
 * `developer.insiderealestate.com` currently hosts three separate ReadMe
 * projects: this one (`publicv2`, "kvCORE Public API V2"), a `webhooks`
 * project, and a newer `boldtrail-api-docs` project describing a *second*,
 * OAuth 2.1 API at `api.boldtrail.com` / `api-developerhub.boldtrail.com`.
 * That newer API's own "Request access" page states plainly: **"This API is
 * not yet publicly available... accessible to partners by invite only"** — no
 * self-serve credential exists for it. The V2 API this app uses is the one
 * whose own "Request Access" guide describes a route any kvCORE user can take
 * themselves, right now, with no partner approval: generate a scoped bearer
 * token from their own account's Lead Dropbox. See `auth/bearer-token.ts`.
 *
 * ## One fixed host, confirmed two ways
 *
 * The OpenAPI document declares exactly one server, `https://api.kvcore.com`,
 * for every one of its ~50 documented paths — there is no per-brokerage or
 * per-account subdomain. This was cross-checked live: an unauthenticated
 * `GET /v2/public/users` against that exact host answers `401` with a real
 * JSON error body (`{"errors":["Authentication Failed"]}`), not a DNS
 * failure or a generic gateway page, confirming the host is live and serves
 * this API for any account.
 *
 * ## Response shapes
 *
 * A single record (`GET /contact/{id}`, `GET /user/{id}`, `GET /office/{id}`,
 * `GET /team/{id}`, create/update responses) answers a bare JSON object.
 * A list endpoint (`GET /contacts`, `GET /users`, `GET /offices`) answers a
 * Laravel-style pagination envelope: `{current_page, data: [...], per_page,
 * total, next_page_url, ...}`. `GET /teams` answers the same envelope, per
 * the vendor's own guides, though its own OpenAPI page for that operation
 * carries no worked example.
 *
 * ## Errors
 *
 * Every failure observed — 401 confirmed live, 400/403/404/409/422 per the
 * vendor's own Response Codes guide — carries `{"errors": ...}`, where the
 * value is either an array of message strings (`["Authentication Failed"]`)
 * or a Laravel-style validation map of field name to an array of messages
 * (`{"email": ["The email has already been taken."]}`). {@link
 * formatKvCoreError} handles both without guessing which shape a given status
 * implies.
 */

/** The one and only API origin the OpenAPI document declares. */
export const API_BASE = "https://api.kvcore.com";

/** Every documented path in this app's surface carries this prefix. */
export const API_PREFIX = "/v2/public";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** The Laravel-style pagination envelope every list endpoint answers. */
export interface KvCoreListPage<T> {
  current_page?: number;
  data: T[];
  first_page_url?: string | null;
  from?: number | null;
  last_page?: number;
  last_page_url?: string | null;
  next_page_url?: string | null;
  path?: string;
  per_page?: number;
  prev_page_url?: string | null;
  to?: number | null;
  total?: number;
}

interface KvCoreErrorBody {
  errors?: string[] | Record<string, string[]>;
  message?: string;
}

/**
 * Drop keys the caller left unset, so an optional filter is never sent as
 * `"undefined"`. Typed against {@link QueryValue} rather than the input's own
 * (usually wider) shape, since this is always called to build a `query`.
 */
export function compact(obj: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v as QueryValue;
  }
  return out;
}

/**
 * Flatten `{errors: [...]} | {errors: {field: [...]}}` into one readable line.
 *
 * The vendor uses the same envelope key for both a flat list of failure
 * reasons (`["Authentication Failed"]`) and a Laravel-style per-field
 * validation map (`{"email": ["The email has already been taken."]}`).
 * Exported so `auth/bearer-token.ts`'s `test` hook reads exactly this, rather
 * than a second hand-rolled parse of the same body.
 */
export function flattenKvCoreErrors(
  errors: string[] | Record<string, string[]> | undefined,
): string[] {
  if (!errors) return [];
  if (Array.isArray(errors)) return errors.filter((e) => typeof e === "string");
  const out: string[] = [];
  for (const [field, messages] of Object.entries(errors)) {
    for (const m of messages) out.push(`${field}: ${m}`);
  }
  return out;
}

/** Keep an error message readable — a validation body can list many fields. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn kvCORE's error body into one actionable line.
 *
 * The credential never enters this module — the message can carry only the
 * vendor's own prose plus the caller's own request path.
 */
export function formatKvCoreError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: KvCoreErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as KvCoreErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const messages = flattenKvCoreErrors(parsed?.errors);
  const detail = messages.length > 0 ? messages.join("; ") : (parsed?.message ?? truncate(raw));
  return truncate(`kvCORE ${status} for ${method} ${path}: ${detail}`, 1000);
}

export class KvCoreClient {
  constructor(private ctx: HookContext) {}

  /** Parsed JSON body. Used for every action — every documented response is JSON. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        // kvCORE's array filters (`filter[status][]`, `filter[hashtags][]`,
        // `offices[]`, `teams[]`) are documented as a REPEATED key, not one
        // comma-joined value — unlike Apify's list filters.
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      // The vendor's own API Standards guide lists this as a REQUIRED header
      // on every request, not merely a body-presence hint.
      "content-type": "application/json",
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) init.body = JSON.stringify(options.body);

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatKvCoreError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
