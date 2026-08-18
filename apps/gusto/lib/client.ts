import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Gusto's **App Integrations API** — the surface an app uses to work with an
 * existing Gusto customer's account, as opposed to Embedded Payroll, which is
 * for platforms that *host* payroll and needs a partnership.
 *
 * Gusto's OpenAPI documents live in a private repository, but its own
 * Speakeasy-generated clients are public, and every path and required parameter
 * here was read from
 * [`Gusto/gusto-python-client`](https://github.com/Gusto/gusto-python-client)'s
 * `gusto_app_int_v_2026_06_15` package (fetched 2026-08-18). The versioning and
 * auth behaviour below was measured against `api.gusto-demo.com` the same day.
 *
 * ## The API version header is not optional, and its default is deprecated
 *
 * Gusto versions by date through `X-Gusto-API-Version`, and the response echoes
 * back which version served it. Measured 2026-08-18:
 *
 *   - **no header** → served, with `deprecation: @1719792000` (1 July 2024) and
 *     a `link: rel="deprecation"` pointing at the version-upgrade guide;
 *   - `2024-04-01` → `deprecation: @1749945600`, a date already past;
 *   - `2025-06-15` → `deprecation: @1763337600`, also past;
 *   - `2026-06-15` → **no deprecation header** — the current version;
 *   - `2099-01-01` → silently served as `2026-06-15`. An unknown version does
 *     not error; it falls back to the newest.
 *
 * So this app pins `2026-06-15` on every request, which is also what Gusto's
 * own 2026-06-15 SDK defaults to. And because the deprecation notice arrives as
 * a *response header*, the `api-version` health check can read it and say when
 * the pin has aged out — see `health/api-version.ts`.
 *
 * ## Two environments, and nothing crosses between them
 *
 * `api.gusto.com` is production; `api.gusto-demo.com` is the demo environment,
 * with its own accounts, its own developer app and its own credentials. A
 * Connection belongs to exactly one, which is why there are two auth methods
 * rather than an environment field.
 *
 * ## `version` is Gusto's optimistic lock
 *
 * Every mutating call carries the resource's current `version` string, and
 * Gusto rejects the write if it is stale — which is how two systems editing the
 * same employee do not silently overwrite each other. It is required, not
 * advisory, and it means an update is always **read, then write**: this app's
 * update actions take the version as a parameter so the caller decides what
 * they are overwriting, rather than fetching-and-forcing behind their back.
 */

/** The two environments, and their API hosts. */
export const HOSTS = {
  production: "https://api.gusto.com",
  demo: "https://api.gusto-demo.com",
} as const;

export type Environment = keyof typeof HOSTS;

/** OAuth endpoints live on the same host as the API. */
export const AUTHORIZE_PATH = "/oauth/authorize";
export const TOKEN_PATH = "/oauth/token";

/**
 * The API version this app is written against.
 *
 * Measured 2026-08-18 as the newest version `api.gusto-demo.com` serves, the
 * only one of the four tried that carries no `deprecation` header, and the
 * default in Gusto's own `gusto_app_int_v_2026_06_15` SDK.
 */
export const API_VERSION = "2026-06-15";

/** Public (redacted-safe) connection metadata. */
export interface GustoConnectionDisplay {
  environment?: Environment;
  companyId?: string;
  companyName?: string;
}

export function displayOf(connection: RedactedConnection | undefined): GustoConnectionDisplay {
  return (connection?.display ?? {}) as GustoConnectionDisplay;
}

export function hostFor(environment: unknown): string {
  return environment === "demo" ? HOSTS.demo : HOSTS.production;
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

/** The company an action works on — the connection's, unless overridden. */
export function companyIdFrom(ctx: HookContext, override?: unknown): string {
  const explicit = String(override ?? "").trim();
  if (explicit) return explicit;
  const fromConnection = String(displayOf(ctx.connection).companyId ?? "");
  if (fromConnection) return fromConnection;
  throw new Error(
    "no company id — this connection records none, so pass `companyId` explicitly " +
      "(`token-info` lists the companies this token reaches)",
  );
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class GustoClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = hostFor(displayOf(ctx.connection).environment);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      // Never optional: without it Gusto serves a version deprecated in 2024.
      "x-gusto-api-version": API_VERSION,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Gusto ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow Gusto's `page`/`per` paging, which every collection uses.
   *
   * The response carries no total; a short page is the end. `per` caps at 100.
   */
  async requestAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    while (items.length < wantTotal) {
      const per = Math.min(100, Math.max(1, wantTotal - items.length));
      const chunk = await this.request<T[]>(path, {
        ...options,
        query: { ...options.query, page, per },
      });
      if (!Array.isArray(chunk) || chunk.length === 0) break;
      items.push(...chunk);
      // A page shorter than asked for is the last one.
      if (chunk.length < per) break;
      page += 1;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}

/**
 * Turn a Gusto error body into something actionable.
 *
 * Gusto answers `422` with a nested `errors` tree naming each offending field,
 * and that tree — not the status — is what says why a payroll write bounced.
 * The stale-`version` case is called out specifically, because it is the one
 * failure a workflow can fix by itself: re-read and retry.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 400);
  try {
    const body = JSON.parse(text) as {
      error?: string;
      error_description?: string;
      errors?: unknown;
      message?: string;
    };
    if (body?.errors !== undefined) detail = JSON.stringify(body.errors).slice(0, 400);
    else if (body?.error_description) detail = body.error_description;
    else if (body?.error) detail = body.error;
    else if (body?.message) detail = body.message;
  } catch { /* not JSON */ }

  if (status === 422 && /version/i.test(detail)) {
    return `${detail} — the \`version\` sent is stale: re-read the record and retry with its ` +
      "current version";
  }
  if (status === 401) {
    return `${detail || "unauthorized"} — Gusto access tokens live 2 hours, so this usually ` +
      "means the refresh did not happen";
  }
  return detail || `${status}`;
}
