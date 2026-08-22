import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Vanta's **Manage Vanta** API — verified against the OpenAPI 3 document Vanta
 * serves at `developer.vanta.com/reference/manage-vanta.json` (164 paths,
 * fetched 2026-08-18).
 *
 * ## Which API this is
 *
 * Vanta publishes three. **Manage Vanta** is the operational surface for *your
 * own tenant* — the work a security team would otherwise click through in the
 * dashboard. **Build Integrations** is for partners pushing data *into*
 * customers' tenants, and the **Auditor API** is for audit firms. This app
 * implements the first, which is the one a customer's workflow can use.
 *
 * ## Two hosts, and Vanta Gov is a separate world
 *
 * `https://api.vanta.com/v1` for commercial tenants, and
 * `https://api.vanta-gov.com/v1` for FedRAMP ones — with its **own token
 * endpoint**, not just its own API host. A credential from one is unknown to
 * the other.
 *
 * ## Everything is wrapped, and the page is small
 *
 * ```json
 * {"results": {"data": [...],
 *              "pageInfo": {"endCursor": "…", "hasNextPage": true,
 *                           "hasPreviousPage": false, "startCursor": "…"}}}
 * ```
 *
 * `pageSize` **defaults to 10** and caps at 100. Ten rows out of a tenant with
 * four hundred failing tests looks like a healthy tenant, so every list action
 * here asks for 100 and pages.
 *
 * ## The rate limits are low and one of them is very low
 *
 * 50 requests per minute across the API, and **5 per minute on
 * `/oauth/token`**. The second is the one that shapes the design — see
 * `auth/client-credentials.ts`.
 */

/** Commercial and FedRAMP hosts. A credential for one is unknown to the other. */
export const HOSTS: Record<string, string> = {
  commercial: "https://api.vanta.com",
  gov: "https://api.vanta-gov.com",
};

export const API_PATH = "/v1";

/** Vanta caps a page at 100 and defaults to 10. */
export const PAGE_LIMIT = 100;

/** Public (redacted-safe) connection metadata. */
export interface VantaConnectionDisplay {
  /** `commercial` or `gov`. */
  region?: string;
}

/** The API origin for a connection, defaulting to the commercial host. */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as VantaConnectionDisplay;
  return hostFor(display.region);
}

/** Resolve a region name to its host, refusing an unknown one by name. */
export function hostFor(region: unknown): string {
  const key = String(region ?? "commercial").trim() || "commercial";
  const host = HOSTS[key];
  if (!host) {
    throw new Error(
      `unknown Vanta region \`${key}\` — use \`commercial\` or \`gov\` (FedRAMP)`,
    );
  }
  return host;
}

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | Array<string | number> | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
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
 * Vanta's `*MatchesAny` filters are repeated keys, so arrays survive as arrays.
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

/** Vanta's date filters take ISO 8601 timestamps. */
export function isoTimestamp(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const text = String(value).trim();
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`\`${field}\` is not a date Vanta can filter on: ${text}`);
  }
  return parsed.toISOString();
}

/** One page of a Vanta list. */
export interface Page<T> {
  items: T[];
  endCursor?: string;
  hasNextPage: boolean;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class VantaClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrlFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${API_PATH}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        // Vanta's `*MatchesAny` filters take repeated keys.
        for (const item of v) url.searchParams.append(k, String(item));
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
        `Vanta ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** One page, unwrapped from Vanta's `{results: {data, pageInfo}}` envelope. */
  async page<T = unknown>(path: string, options: RequestOptions = {}): Promise<Page<T>> {
    const body = await this.request<{
      results?: {
        data?: T[];
        pageInfo?: { endCursor?: string | null; hasNextPage?: boolean };
      };
    }>(path, options);
    const results = body?.results ?? {};
    return {
      items: Array.isArray(results.data) ? results.data : [],
      endCursor: results.pageInfo?.endCursor ?? undefined,
      hasNextPage: results.pageInfo?.hasNextPage === true,
    };
  }

  /**
   * Follow `pageInfo.endCursor` to the end, or until `wantTotal` rows.
   *
   * Always asks for 100 rather than accepting Vanta's default of 10 — a first
   * page of ten failing tests out of four hundred reads as a healthy tenant,
   * and nothing in the response says otherwise except a flag most callers
   * forget to check. `hasNextPage` is returned so a truncated walk is visible.
   */
  async pageAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
    maxPages = 50,
  ): Promise<Page<T>> {
    const items: T[] = [];
    let cursor: string | undefined;
    let hasNextPage = false;
    let pages = 0;

    while (items.length < wantTotal && pages < maxPages) {
      const pageSize = Math.min(PAGE_LIMIT, Math.max(1, wantTotal - items.length));
      const page = await this.page<T>(path, {
        ...options,
        query: {
          ...options.query,
          pageSize: Number.isFinite(wantTotal) ? pageSize : PAGE_LIMIT,
          pageCursor: cursor,
        },
      });
      items.push(...page.items);
      pages += 1;
      hasNextPage = page.hasNextPage;
      if (!page.hasNextPage || !page.endCursor) break;
      cursor = page.endCursor;
    }

    return {
      items: Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items,
      endCursor: cursor,
      hasNextPage,
    };
  }
}

/**
 * Turn a Vanta error into something actionable.
 *
 * The two worth explaining are the ones whose obvious reading is wrong: a `401`
 * is as likely to mean *another process minted a token for the same
 * application* as it is to mean a bad credential, and a `429` on the token
 * endpoint is a different, much tighter limit than a `429` on the API.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as {
      message?: string;
      error?: string;
      error_description?: string;
      errors?: Array<{ message?: string; field?: string }>;
    };
    detail = body?.message ?? body?.error_description ?? body?.error ?? detail;
    if (Array.isArray(body?.errors) && body.errors.length > 0) {
      const fields = body.errors
        .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
        .filter(Boolean)
        .join("; ");
      if (fields) detail = `${detail} (${fields})`;
    }
  } catch { /* not JSON */ }

  if (status === 401) {
    return `${detail} — the token may have expired, or ANOTHER PROCESS may have minted one for ` +
      "the same Vanta application: Vanta allows one active token per application, and issuing a " +
      "new one immediately revokes the old";
  }
  if (status === 403) {
    return `${detail} — the token authenticated but its scopes do not cover this call. Vanta ` +
      "scopes are requested at token time (`vanta-api.all:read`, `…:write`, and per-resource " +
      "variants) and must match what the application was created for";
  }
  if (status === 429) {
    return `${detail} — Vanta allows 50 requests per minute across the API, and only 5 per ` +
      "minute on the token endpoint. If this was a token request, that second limit is the one " +
      "you hit, and it is far tighter than it looks";
  }
  return detail || `${status}`;
}
