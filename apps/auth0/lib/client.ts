import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Auth0's **Management API v2**.
 *
 * Auth0 publishes no fetchable OpenAPI document, so paths came from its
 * reference documentation and every one this app calls was verified to route
 * against a live Auth0 domain on 2026-08-18 (each answers `401 {"statusCode":
 * 401,"error":"Unauthorized","message":"Missing authentication"}` rather than a
 * 404).
 *
 * ## The tenant is the host
 *
 * Every call goes to `https://{tenant}.{region}.auth0.com/api/v2/…` — there is
 * no shared API host, which is why the domain is part of the credential and why
 * this app's egress allowlist is `*.auth0.com`.
 *
 * **Custom domains are deliberately not supported here.** A tenant can front its
 * *Authentication* API with `auth.acme.com`, and allowing an arbitrary host to
 * satisfy this app would mean widening egress to `*` on the strength of a
 * hostname a user typed. The canonical `{tenant}.{region}.auth0.com` always
 * works for the Management API, so that is what this app uses.
 *
 * ## Two silent limits on reading users
 *
 * Both are Auth0's own documented behaviour, and both fail quietly:
 *
 *   1. **`GET /users` is eventually consistent.** Auth0: *"The Management API's
 *      List or Search Users endpoint (`GET /users`) is eventually consistent,
 *      so results may not immediately reflect recently-completed write
 *      operations."* A workflow that creates a user and then searches for it
 *      can legitimately not find it.
 *   2. **Search returns at most 1,000 users**, *"even if more users match your
 *      query"* — no error, no indication.
 *
 * `user-get` and `user-get-by-email` are the immediately-consistent
 * alternatives, and this app points at them wherever the distinction matters.
 */
export const API_PATH = "/api/v2";

/** Public (redacted-safe) connection metadata. */
export interface Auth0ConnectionDisplay {
  domain?: string;
  tenant?: string;
}

export function displayOf(connection: RedactedConnection | undefined): Auth0ConnectionDisplay {
  return (connection?.display ?? {}) as Auth0ConnectionDisplay;
}

/**
 * Normalise a user-typed tenant domain, and refuse anything that is not an
 * Auth0 one.
 *
 * The refusal is the point: this app's egress allowlist is `*.auth0.com`, so a
 * custom domain would fail at the sandbox with an opaque error rather than
 * here with an explanation.
 */
export function normalizeDomain(raw: string): string {
  const trimmed = String(raw ?? "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (!trimmed) throw new Error("no Auth0 domain given");
  const host = trimmed.split("/")[0].toLowerCase();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.auth0\.com$/.test(host)) {
    throw new Error(
      `"${host}" is not an Auth0 domain. This app calls the canonical tenant domain — ` +
        "`tenant.us.auth0.com`, `tenant.eu.auth0.com` and so on. A custom domain fronts the " +
        "Authentication API, not the Management API.",
    );
  }
  return host;
}

/** The audience a Management API token must be minted for. */
export function managementAudience(domain: string): string {
  return `https://${normalizeDomain(domain)}/api/v2/`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset, so an update does not clear untouched fields. */
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

/** Auth0's own ceiling on a user search, applied silently. */
export const USER_SEARCH_CAP = 1000;

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class Auth0Client {
  readonly base: string;
  readonly domain: string;

  constructor(private ctx: HookContext) {
    this.domain = String(displayOf(ctx.connection).domain ?? "");
    if (!this.domain) {
      throw new Error(
        "this connection has no Auth0 domain — reconnect the tenant, since the domain is the " +
          "API's hostname",
      );
    }
    this.base = `https://${this.domain}${API_PATH}`;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
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
    if (!res.ok) {
      throw new Error(
        `Auth0 ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text, res.headers)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow Auth0's `page`/`per_page` paging.
   *
   * `include_totals` is what makes the end of the list knowable: without it the
   * response is a bare array and the only signal is a short page. With it,
   * Auth0 wraps the results and reports `total`, which is also how a caller
   * learns they hit the 1,000-result search ceiling.
   */
  async requestAll<T = unknown>(
    path: string,
    key: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<{ items: T[]; total?: number }> {
    const items: T[] = [];
    let page = 0;
    let total: number | undefined;

    while (items.length < wantTotal) {
      const perPage = Math.min(100, Math.max(1, wantTotal - items.length));
      const body = await this.request<Record<string, unknown> | T[]>(path, {
        ...options,
        query: { ...options.query, page, per_page: perPage, include_totals: true },
      });
      // With include_totals Auth0 wraps the array; without it (some endpoints
      // ignore the flag) it answers a bare array.
      const chunk = (Array.isArray(body) ? body : (body?.[key] as T[])) ?? [];
      if (!Array.isArray(body) && typeof body?.total === "number") total = body.total as number;
      items.push(...chunk);
      if (chunk.length === 0 || chunk.length < perPage) break;
      page += 1;
    }
    return {
      items: Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items,
      total,
    };
  }
}

/**
 * Turn an Auth0 error into something actionable.
 *
 * Auth0 answers `{statusCode, error, message}` and, for a validation failure, a
 * `errorCode` naming the rule that was broken — which is the half that says
 * *why* a user could not be created.
 */
export function describeError(status: number, text: string, headers?: Headers): string {
  let detail = text.slice(0, 400);
  try {
    const body = JSON.parse(text) as {
      message?: string;
      error?: string;
      error_description?: string;
      errorCode?: string;
    };
    detail = body?.message ?? body?.error_description ?? body?.error ?? detail;
    if (body?.errorCode) detail = `${detail} (${body.errorCode})`;
  } catch { /* not JSON */ }

  if (status === 429) {
    const reset = headers?.get("x-ratelimit-reset");
    return `${detail} — rate limited${reset ? `, resets at ${reset}` : ""}. Auth0 meters the ` +
      "Management API per tenant, and a bulk job should be spread out rather than retried hard";
  }
  if (status === 401) {
    return `${detail} — Management API tokens are short-lived, so this usually means the token ` +
      "was not refreshed";
  }
  if (status === 403) {
    return `${detail} — the machine-to-machine application is missing the scope this call needs; ` +
      "scopes are granted per API in the Auth0 dashboard, not requested here";
  }
  return detail || `${status}`;
}
