import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * dbt Cloud's Administrative API — verified against dbt Labs' own OpenAPI
 * documents (`github.com/dbt-labs/dbt-cloud-openapi-spec`, `openapi-v2.yaml`
 * 52 operations and `openapi-v3.yaml` 155 operations, fetched 2026-08-18).
 *
 * ## The host is per account, and there is no default that works for everyone
 *
 * dbt Cloud runs in cells. An account's **Access URL** is
 * `{prefix}.{cell}.dbt.com` — `us1`, `us2`, `us3`, `us5`, `eu1`…`eu4`, `au1`,
 * `au2`, `jp1` — with the legacy hosts `cloud.getdbt.com` (US), `emea.dbt.com`
 * and `au.dbt.com` still serving older accounts. The v2 document's `servers`
 * block lists exactly those four shapes.
 *
 * A request to the wrong cell does not fail with "wrong region": the token is
 * unknown there, so it answers `401 Invalid token.`, which reads as a bad
 * credential. That is why the Access URL is asked for explicitly, and why the
 * connection test names it back.
 *
 * ## Two API versions, both current
 *
 * This is not a deprecation — the versions divide by *subject*:
 *
 *   - **v2** owns runs and jobs. There are no run endpoints in v3 at all.
 *   - **v3** owns the platform objects: projects, environments, environment
 *     variables, warehouse connections, users, groups, service tokens, audit
 *     logs.
 *
 * dbt's own docs say v3 is preferred "but we don't yet have all our v2 routes
 * upgraded". Each action uses the version that has the endpoint, and the README
 * says which.
 *
 * ## Every response is enveloped
 *
 * `{"data": …, "status": {"code", "is_success", "user_message",
 * "developer_message"}}`, with list responses adding
 * `{"extra": {"pagination": {"count", "total_count"}}}`. `user_message` is the
 * readable half of an error and is what this surfaces; `data` is unwrapped so
 * actions never carry the envelope around.
 */

/** The legacy US host, and the default when a connection names no Access URL. */
export const DEFAULT_ACCESS_URL = "https://cloud.getdbt.com";

/** dbt caps a page at 100 rows on every list endpoint. */
export const PAGE_LIMIT = 100;

/**
 * Run status is a **number**, and the numbers are not contiguous — there is no
 * 4 through 9, and no 11 through 19. A workflow comparing `status > 3` to mean
 * "finished" happens to work; one comparing `status === 4` waits forever.
 *
 * dbt does return `status_humanized`, `is_complete`, `is_success`, `is_error`
 * and `is_cancelled` alongside, and those are the fields worth branching on.
 */
export const RUN_STATUS: Record<number, string> = {
  1: "Queued",
  2: "Starting",
  3: "Running",
  10: "Success",
  20: "Error",
  30: "Cancelled",
};

/** Name a run status number, falling back to the number itself. */
export function runStatusName(status: unknown): string {
  const n = Number(status);
  return RUN_STATUS[n] ?? `status ${status}`;
}

export interface DbtCloudConnectionDisplay {
  /** The account's Access URL origin. */
  accessUrl?: string;
  /** The account id discovered at connect time. */
  accountId?: number | string;
  /** The account's name, for the connection label. */
  accountName?: string;
}

/**
 * Normalise a user-typed Access URL into a bare origin.
 *
 * dbt's own settings page shows the URL with a path on it, and pasting that
 * verbatim would produce `…/deploy/api/v2/…`. A missing scheme defaults to
 * `https`, because an API token in flight deserves TLS.
 */
export function normalizeAccessUrl(raw: unknown): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return DEFAULT_ACCESS_URL;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`dbt Cloud Access URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`dbt Cloud Access URL has no host: ${trimmed}`);
  return `${url.protocol}//${url.host}`;
}

/** Read the Access URL off the redacted Connection; the legacy US host is the default. */
export function accessUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as DbtCloudConnectionDisplay;
  return display.accessUrl ? normalizeAccessUrl(display.accessUrl) : DEFAULT_ACCESS_URL;
}

/**
 * The account id every path needs.
 *
 * It is discovered once at connect time rather than typed into each action,
 * because a token belongs to exactly one account and typing the wrong id gives
 * a `404` that reads like a missing job.
 */
export function accountIdFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as DbtCloudConnectionDisplay;
  const id = String(display.accountId ?? "").trim();
  if (!id) {
    throw new Error(
      "this connection has no account id — reconnect it, or set the Account ID field, so the " +
        "app knows which account's jobs to act on",
    );
  }
  return id;
}

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | Array<string | number> | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Return the raw text instead of parsing — artifacts are not all JSON. */
  raw?: boolean;
}

/** Drop keys the caller left unset, so a filter is absent rather than empty. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/**
 * `compact` for a query string, keeping the value type the client expects.
 *
 * Params arrive as `unknown`, and a filter left blank has to disappear rather
 * than be sent as an empty string — dbt treats `?project_id=` as a filter on
 * the empty project and returns nothing.
 */
export function query(obj: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      const items = v.map((i) => (typeof i === "number" ? i : String(i)));
      if (items.length === 0) continue;
      out[k] = items;
      continue;
    }
    if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    else out[k] = String(v);
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

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class DbtCloudClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = accessUrlFromConnection(ctx.connection);
  }

  /** The account id this connection belongs to. */
  get accountId(): string {
    return accountIdFromConnection(this.ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        // dbt takes `__in` filters as one comma-separated value, not repeated keys.
        url.searchParams.set(k, v.join(","));
      } else {
        url.searchParams.set(k, String(v));
      }
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
        `dbt Cloud ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text, res.headers)
        }`,
      );
    }
    if (options.raw) return text as T;
    if (res.status === 204 || !text) return undefined as T;
    // Unwrap the envelope: actions should never carry `{data, status}` around.
    const body = JSON.parse(text) as { data?: unknown };
    return (Object.prototype.hasOwnProperty.call(body, "data") ? body.data : body) as T;
  }

  /**
   * Follow dbt's `limit`/`offset` paging, collecting `data`.
   *
   * There is no cursor and no "has more" flag — the stop condition is a short
   * page, or `extra.pagination.total_count` being reached. A page is capped at
   * 100 rows however large a `limit` is sent.
   */
  async requestAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<{ items: T[]; totalCount?: number }> {
    const items: T[] = [];
    let offset = 0;
    let totalCount: number | undefined;

    while (items.length < wantTotal) {
      const limit = Math.min(PAGE_LIMIT, Math.max(1, wantTotal - items.length));
      const url = new URL(`${this.base}${path}`);
      for (const [k, v] of Object.entries(options.query ?? {})) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
      }
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(offset));

      const res = await this.ctx.fetch(url.toString(), {
        method: "GET",
        headers: { accept: "application/json" },
      });
      const text = await res.text().catch(() => "");
      if (!res.ok) {
        throw new Error(
          `dbt Cloud ${res.status} for GET ${url.pathname}: ${
            describeError(res.status, text, res.headers)
          }`,
        );
      }
      const body = JSON.parse(text || "{}") as {
        data?: T[];
        extra?: { pagination?: { total_count?: number } };
      };
      const chunk = body?.data ?? [];
      items.push(...chunk);
      totalCount = body?.extra?.pagination?.total_count ?? totalCount;
      offset += chunk.length;
      if (chunk.length < limit) break;
      if (totalCount !== undefined && items.length >= totalCount) break;
    }
    return {
      items: Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items,
      totalCount,
    };
  }
}

/**
 * Turn a dbt Cloud error into something actionable.
 *
 * Errors arrive in the same envelope as successes:
 * `{"status": {"code", "is_success": false, "user_message", "developer_message"},
 * "data": null}`. `user_message` is written for a person and is the half worth
 * surfacing; `developer_message` is often null.
 */
export function describeError(status: number, text: string, headers?: Headers): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as {
      status?: { user_message?: string; developer_message?: string };
      detail?: string;
    };
    const user = body?.status?.user_message;
    const dev = body?.status?.developer_message;
    detail = [user, dev].filter(Boolean).join(" — ") || body?.detail || detail;
  } catch { /* not JSON */ }

  if (status === 401) {
    return `${detail} — check the token, and that the Access URL matches the account's cell: a ` +
      "token presented to the wrong dbt Cloud region is simply unknown there, and answers 401 " +
      "exactly like a bad token";
  }
  if (status === 429) {
    // dbt sends both headers, and enforces a five-minute cooldown after the
    // limit is hit — so the retry is not "in a second".
    const after = headers?.get("retry-after") ??
      headers?.get("x-rate-limit-retry-after-seconds") ?? undefined;
    return `${detail} — rate limited${after ? `, retry after ${after}s` : ""}. dbt enforces a ` +
      "five-minute cooldown once the limit is hit, so backing off by a second will not help";
  }
  return detail || `${status}`;
}
