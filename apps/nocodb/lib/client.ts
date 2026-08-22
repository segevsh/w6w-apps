import type { HookContext } from "@w6w/types";

/**
 * NocoDB — the **v2** API, built against the vendor's own OpenAPI schema
 * (`swagger-v2.json`) and probed live against `app.nocodb.com` on 2026-08-19.
 *
 * ## Every deployment is its own host
 *
 * NocoDB is open source and mostly self-hosted; the cloud is one deployment of
 * the same software at `app.nocodb.com`. So the allowlist is `*` and the
 * health checks are connection-scoped.
 *
 * ## Two auth headers, and this app uses the one that lasts
 *
 * `xc-token` carries an **API token**, which does not expire. `xc-auth`
 * carries a session JWT, which does. Both work everywhere; only one belongs in
 * an automation.
 *
 * ## A missing table is a 404 *before* the credential is checked
 *
 * Verified live: `GET /api/v2/tables/bogus/records` with no credential at all
 * answers **404 `ERR_TABLE_NOT_FOUND`**, not 401. That ordering is worth
 * knowing in both directions: a "table not found" during a workflow run is
 * always a table-id problem and never a credential one, and a 401 from that
 * endpoint is confirmation that the table id is real.
 *
 * ## The errors are machine-readable, which is rarer than it should be
 *
 * `{"error":"ERR_AUTHENTICATION_REQUIRED","message":"…"}` — a stable code
 * alongside the prose. `describeError` reads the code rather than matching on
 * the message, so a reworded message does not break the handling.
 *
 * ## The rate limit is published, and it is small
 *
 * Measured on every response, authenticated or not:
 *
 *     x-ratelimit-limit: 60
 *     x-ratelimit-remaining: 57
 *     x-ratelimit-reset: 60
 *
 * Sixty requests a minute, counted per caller. A workflow that walks a table
 * 25 records at a time exhausts that in a page and a half of a large table, so
 * `record-list` takes a larger page rather than looping — and the `quota`
 * health check reads the real remaining count rather than guessing.
 *
 * ## The `where` syntax tolerates no spaces
 *
 * `(field,eq,value)~and(other,gt,3)`. NocoDB's own documentation says: "do not
 * include spaces between the different condition components". A filter written
 * the way a person writes SQL silently matches nothing, and `assertWhere`
 * catches the commonest version of that before the request.
 */

export const DEFAULT_PAGE_SIZE = 25;

export type QueryValue = string | number | boolean | undefined | null;

/** Coerce loosely-typed action params into query-string values, dropping empties. */
export function query(obj: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "number" || typeof v === "boolean" ? v : String(v);
  }
  return out;
}

/** Drop keys the caller left unset. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
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

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/** Which host a connection speaks to. */
export function hostFromConnection(connection: unknown): string {
  const display = (connection as { display?: Record<string, unknown> } | undefined)?.display;
  const host = String(display?.host ?? "").trim();
  if (!host) {
    throw new Error(
      "this connection has no NocoDB host recorded — NocoDB is self-hosted as often as not, so " +
        "there is no default. Reconnect to record one",
    );
  }
  return host;
}

/** Normalise a host: add a scheme, drop a trailing slash and any API path. */
export function normalizeHost(value: unknown): string {
  const raw = String(value ?? "").trim().replace(/\/+$/, "").replace(/\/api\/v\d.*$/, "");
  if (!raw) throw new Error("a NocoDB host is required");
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    return `${url.protocol}//${url.host}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    throw new Error(`\`${raw}\` is not a usable host`);
  }
}

/**
 * Check a `where` expression for the mistake NocoDB's documentation warns
 * about and its response does not.
 *
 * A filter with spaces around the commas parses as a field named `field ` that
 * does not exist — and NocoDB answers with an empty result rather than an
 * error, so the workflow proceeds on the belief that nothing matched.
 */
export function assertWhere(where: string): void {
  if (!where.trim()) return;
  if (!/\(/.test(where)) {
    throw new Error(
      `\`where\` must use NocoDB's condition syntax — \`(field,eq,value)\`, joined with \`~and\` ` +
        `or \`~or\`. Got ${JSON.stringify(where.slice(0, 60))}, which looks like SQL`,
    );
  }
  if (/\(\s|\s,|,\s/.test(where)) {
    throw new Error(
      "`where` must not contain spaces between the parts of a condition — NocoDB's own " +
        "documentation says so, and a filter written `(field, eq, value)` matches a field whose " +
        "name ends in a space. The request succeeds and returns NOTHING, which reads as no " +
        "records matching",
    );
  }
}

/** The rate-limit headers NocoDB publishes on every response. */
export interface RateLimit {
  limit?: number;
  remaining?: number;
  resetSeconds?: number;
}

export function readRateLimit(headers: Headers): RateLimit {
  const num = (name: string): number | undefined => {
    const value = headers.get(name);
    if (value === null) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  return {
    limit: num("x-ratelimit-limit"),
    remaining: num("x-ratelimit-remaining"),
    resetSeconds: num("x-ratelimit-reset"),
  };
}

/** What NocoDB's error codes mean, in terms of what to do about them. */
const ERROR_MEANING: Record<string, string> = {
  ERR_AUTHENTICATION_REQUIRED:
    "the token was rejected. NocoDB takes an API token in `xc-token`; a session JWT goes in " +
    "`xc-auth` and expires, so a connection made with one stops working days later",
  ERR_TABLE_NOT_FOUND:
    "no table with that id. NocoDB checks this BEFORE the credential — verified live, an " +
    "unauthenticated request for a missing table answers 404 rather than 401 — so this is " +
    "always a table-id problem and never an auth one",
  ERR_BASE_NOT_FOUND: "no base with that id, or none this token can see",
  ERR_RECORD_NOT_FOUND:
    "no record with that id in this table. Note the primary key column is usually `Id`, and a " +
    "record id is not the row number",
};

/** Turn a NocoDB error into something actionable. */
export function describeError(status: number, text: string): string {
  let code = "";
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as { error?: string; message?: string; msg?: string };
    code = String(body?.error ?? "");
    detail = body?.message ?? body?.msg ?? detail;
  } catch { /* not JSON */ }

  // The code is stable; the message is prose that gets reworded.
  const meaning = ERROR_MEANING[code];
  if (meaning) return `${detail} [${code}] — ${meaning}`;

  if (status === 403) {
    return `${detail} — the token authenticated and is not permitted. NocoDB scopes a token ` +
      "to the bases its owner can reach, and a base role of viewer can read and not write";
  }
  if (status === 429) {
    return `${detail} — rate limited. NocoDB allows 60 requests a minute per caller and reports ` +
      "the remaining count in `x-ratelimit-remaining` on every response, so this is visible " +
      "before it happens";
  }
  return code ? `${detail} [${code}]` : detail || `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** A response, with the rate-limit headroom it reported. */
export interface Result<T> {
  data: T;
  rateLimit: RateLimit;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the token — the runtime routes
 * every request through the auth `sign` hook.
 */
export class NocoDBClient {
  private host: string;

  constructor(private ctx: HookContext, host?: string) {
    this.host = host ?? hostFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return (await this.full<T>(path, options)).data;
  }

  async full<T = unknown>(path: string, options: RequestOptions = {}): Promise<Result<T>> {
    const url = new URL(`${this.host}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    const rateLimit = readRateLimit(res.headers);

    if (!res.ok) {
      throw new Error(
        `NocoDB ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }

    if (res.status === 204 || !text) return { data: undefined as T, rateLimit };
    try {
      return { data: JSON.parse(text) as T, rateLimit };
    } catch {
      throw new Error(`NocoDB did not return JSON: ${text.slice(0, 160)}`);
    }
  }
}

/** NocoDB's paging block, which rides along with every list response. */
export interface PageInfo {
  totalRows?: number;
  page?: number;
  pageSize?: number;
  isFirstPage?: boolean;
  isLastPage?: boolean;
}
