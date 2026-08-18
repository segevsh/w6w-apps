import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Deel's REST API — verified against the OpenAPI documents Deel serves from its
 * own developer host. `https://developer.deel.com/openapi.json` is an **index**
 * of them, and this app was built from four:
 *
 *   - `openapi/ic-endpoints.json`   — contracts, milestones, timesheets,
 *                                     invoice adjustments (29 paths)
 *   - `openapi/hris-endpoints.json` — people, time off, org structures
 *                                     (47 paths)
 *   - `openapi/endpoints.json`      — webhooks, lookups, legal entities
 *                                     (34 paths)
 *   - `openapi/endpoints-3.json`    — adjustments, global payroll, time
 *                                     tracking (27 paths)
 *
 * All of them name the same servers: `https://api.letsdeel.com/rest`
 * (production) and `https://api-staging.letsdeel.com/rest` (Deel's demo
 * environment), and the same `deelToken` bearer scheme. Both hosts are on the
 * egress allowlist so a Connection can point at the sandbox.
 *
 * Fetched 2026-08-18.
 */
export const PRODUCTION = "https://api.letsdeel.com/rest";
export const SANDBOX = "https://api-staging.letsdeel.com/rest";

/** Public (redacted-safe) connection metadata. */
export interface DeelConnectionDisplay {
  /** Which Deel environment this connection points at. */
  environment?: "production" | "sandbox";
}

/** Resolve the base URL from the Connection's public metadata. */
export function resolveBase(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as DeelConnectionDisplay;
  return display.environment === "sandbox" ? SANDBOX : PRODUCTION;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset so a PATCH doesn't clear untouched fields. */
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

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 *
 * **Note on the spec's `Authorization` parameter.** Several Deel operations
 * declare `Authorization` as a *required header parameter* alongside the
 * document's own `deelToken` security scheme. That is redundant, and copying it
 * into an action's params would put a credential in a form field where the
 * sandbox forbids it. It is deliberately ignored: the `sign` hook supplies the
 * header, as it does for every other app in this pack.
 */
export class DeelClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = resolveBase(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Deel repeats a key for its list-valued filters (`?statuses=a&statuses=b`).
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, String(item)); }
      else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Deel answers `{ "errors": [{ "message", ... }] }` — surfaced verbatim,
      // because the message names the field a 422 is about.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Deel ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow Deel's **cursor** pagination — `{ data, page: { cursor, total_rows } }`,
   * walked by passing the returned `cursor` back as `after_cursor`. Used by the
   * contract collections.
   */
  async requestAllCursor<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let afterCursor: string | undefined;
    const pageSize = 100;
    while (items.length < wantTotal) {
      const page = await this.request<{ data?: T[]; page?: { cursor?: string } }>(path, {
        ...options,
        query: { ...options.query, limit: pageSize, after_cursor: afterCursor },
      });
      const chunk = page?.data ?? [];
      items.push(...chunk);
      afterCursor = page?.page?.cursor;
      if (!afterCursor || chunk.length === 0) break;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }

  /**
   * Follow Deel's **offset** pagination — `{ data, page: { offset, total_rows,
   * items_per_page } }`. Used by the HRIS collections, and not interchangeable
   * with the cursor form above: sending `after_cursor` to an offset endpoint is
   * silently ignored and returns page one forever.
   */
  async requestAllOffset<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let offset = 0;
    const pageSize = 100;
    while (items.length < wantTotal) {
      const page = await this.request<{ data?: T[]; page?: { total_rows?: number } }>(path, {
        ...options,
        query: { ...options.query, limit: pageSize, offset },
      });
      const chunk = page?.data ?? [];
      items.push(...chunk);
      if (chunk.length === 0) break;
      offset += chunk.length;
      const total = page?.page?.total_rows;
      if (typeof total === "number" && offset >= total) break;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
