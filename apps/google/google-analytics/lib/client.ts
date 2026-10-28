import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * GA4 is **two APIs on two hosts**, and which one an action uses is not a
 * detail it can hide:
 *
 *   - **Data API** (`analyticsdata.googleapis.com`) — reporting. Every report
 *     is a POST whose body is the query.
 *   - **Admin API** (`analyticsadmin.googleapis.com`) — the configuration
 *     tree: accounts, properties, data streams, key events, custom dimensions.
 *
 * Both are `v1beta` and both are declared on the manifest's egress allowlist.
 * They are separate services with separate quotas, which is why the app
 * declares two hosts rather than the generic `www.googleapis.com` — the same
 * reasoning the `google-ads` app in this pack applies to its single host.
 *
 * Verified against Google's own discovery documents, fetched 2026-08-18:
 * `https://analyticsdata.googleapis.com/$discovery/rest?version=v1beta` and
 * `https://analyticsadmin.googleapis.com/$discovery/rest?version=v1beta`.
 */
export const DATA_API = "https://analyticsdata.googleapis.com/v1beta";
export const ADMIN_API = "https://analyticsadmin.googleapis.com/v1beta";

/**
 * Public (redacted-safe) connection metadata, published at connect time.
 */
export interface GAConnectionDisplay {
  /** The GA4 property these actions default to, as a bare numeric id. */
  propertyId?: string;
}

/**
 * GA4 resource names are `properties/123456789`, and people paste the id in
 * four different shapes: bare (`123456789`), prefixed (`properties/123456789`),
 * with the UI's whitespace, or with a stray trailing slash. All four normalize
 * to the bare id here so the caller never has to care, and every path is built
 * from `properties/${id}`.
 */
export function normalizePropertyId(value: unknown, field = "propertyId"): string {
  const raw = String(value ?? "").trim().replace(/^properties\//, "").replace(/\/+$/, "");
  if (!raw) throw new Error(`\`${field}\` is required`);
  if (!/^\d+$/.test(raw)) {
    throw new Error(`\`${field}\` must be a numeric GA4 property id — got "${raw}"`);
  }
  return raw;
}

/** Resolve the property: the action's override wins, else the connection's. */
export function resolveProperty(
  connection: RedactedConnection | undefined,
  override?: unknown,
): string {
  const explicit = String(override ?? "").trim();
  if (explicit) return normalizePropertyId(explicit);
  const display = (connection?.display ?? {}) as GAConnectionDisplay;
  if (display.propertyId) return normalizePropertyId(display.propertyId);
  throw new Error(
    "no GA4 property — set one on the connection or pass `propertyId` on the action",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: Record<string, unknown>;
}

/** Drop keys the caller left unset so a POST doesn't send empty fields. */
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
 * Turn a comma-separated list of GA4 dimension or metric names into the
 * `[{name}]` array both APIs take. Reporting is the common case and typing
 * `[{"name":"date"},{"name":"country"}]` into a form for it would be hostile.
 */
export function named(list: string[] | undefined): Array<{ name: string }> | undefined {
  return list?.map((name) => ({ name }));
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class GoogleAnalyticsClient {
  constructor(private ctx: HookContext) {}

  private async send<T>(base: string, path: string, options: RequestOptions): Promise<T> {
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
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
      // Google's error envelope is `{ "error": { "code", "message", "status" } }`
      // — the message names the offending field for a bad report request, which
      // is the difference between "no such metric" and "you lack access".
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Google Analytics ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** A Data API request (reporting). */
  data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.send<T>(DATA_API, path, options);
  }

  /** An Admin API request (configuration). */
  admin<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.send<T>(ADMIN_API, path, options);
  }

  /**
   * Follow the Admin API's `pageToken` pagination until `wantTotal` items are
   * collected or Google stops returning a `nextPageToken`.
   *
   * Google's list responses are `{ <collectionKey>: [...], nextPageToken }`,
   * and the token is **absent on the last page** — a clean termination signal.
   * The Data API does not paginate this way at all: its reports use
   * `limit`/`offset` inside the request body, so reporting actions never come
   * through here.
   */
  async adminAll<T = unknown>(
    path: string,
    collectionKey: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let pageToken: string | undefined;
    const pageSize = 200;
    while (items.length < wantTotal) {
      const page = await this.admin<Record<string, unknown>>(path, {
        ...options,
        query: { ...options.query, pageSize, pageToken },
      });
      const chunk = (page?.[collectionKey] as T[] | undefined) ?? [];
      items.push(...chunk);
      pageToken = page?.nextPageToken as string | undefined;
      if (!pageToken || chunk.length === 0) break;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
