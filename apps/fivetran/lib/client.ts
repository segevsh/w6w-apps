import type { HookContext } from "@w6w/types";

/**
 * Fivetran's REST API v1 — verified against the OpenAPI document Fivetran
 * publishes in its own Terraform provider
 * (`github.com/fivetran/terraform-provider-fivetran`, `open-api-spec.json`,
 * 99 paths, fetched 2026-08-18) and probed live the same day: `/v1/groups`
 * answers `401` while `/v1/nope` answers `404`, so the 401s prove the routes.
 *
 * ## The Accept header carries the API version
 *
 * `Accept: application/json;version=2` — the spec's own default. Fivetran
 * answers **`406 Not Acceptable`** for an Accept header it does not recognise,
 * which is an unusual and unhelpful-looking failure if you have not seen it
 * before. Every request here pins the version rather than sending a bare
 * `application/json`, and the docs' "getting started" page still shows the bare
 * form.
 *
 * ## Everything is enveloped
 *
 * `{"code": "Success", "message": "…", "data": {…}}` on success, and
 * `{"code": "…", "message": "…"}` with no `data` on failure. The client unwraps
 * `data` so no action carries the envelope around, and surfaces `message` on
 * an error — `code` alone is rarely enough to act on.
 *
 * ## A "group" is a destination
 *
 * The single most confusing thing in this API. `GET /v1/groups` is titled, in
 * Fivetran's own spec, *"List All Destinations within Account"* — a group and a
 * destination are the same thing seen from two sides: the group is the
 * container of connections, the destination is the warehouse those connections
 * write into, and they share an id. This app keeps both names because both
 * appear in the API, and says so wherever it matters.
 */
export const BASE_URL = "https://api.fivetran.com";

/**
 * The versioned Accept header. A bare `application/json` risks a `406`, and a
 * future version will change behaviour rather than break — so it is pinned.
 */
export const API_VERSION = "application/json;version=2";

/** Fivetran's list endpoints accept 1..1000 and default to 100. */
export const PAGE_LIMIT = 1000;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | Array<string | number> | undefined | null;

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

/** `compact` for a query string, keeping the value type the client expects. */
export function query(obj: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
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

/** Fivetran's date filters take ISO 8601 timestamps. */
export function isoTimestamp(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const text = String(value).trim();
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`\`${field}\` is not a date Fivetran can filter on: ${text}`);
  }
  return parsed.toISOString();
}

/** One page of a Fivetran list. */
export interface Page<T> {
  items: T[];
  nextCursor?: string;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class FivetranClient {
  constructor(private ctx: HookContext) {}

  /** The response envelope's `data`, with the headers alongside. */
  async raw<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ data: T; headers: Headers }> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: API_VERSION };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Fivetran ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text, res.headers)
        }`,
      );
    }
    if (res.status === 204 || !text) return { data: undefined as T, headers: res.headers };

    const body = JSON.parse(text) as { code?: string; message?: string; data?: T };
    return { data: body?.data as T, headers: res.headers };
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { data } = await this.raw<T>(path, options);
    return data;
  }

  /** One page, unwrapped from Fivetran's `{data: {items, next_cursor}}`. */
  async page<T = unknown>(path: string, options: RequestOptions = {}): Promise<Page<T>> {
    const data = await this.request<{ items?: T[]; next_cursor?: string | null }>(path, options);
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      nextCursor: data?.next_cursor ?? undefined,
    };
  }

  /**
   * Follow `next_cursor` to the end, or until `wantTotal` rows.
   *
   * Fivetran accepts a `limit` of up to 1000, which is generous enough that
   * most collections fit in one page — so this asks for what is wanted rather
   * than always asking for the maximum, and stops as soon as the cursor runs
   * out.
   */
  async pageAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
    maxPages = 20,
  ): Promise<Page<T>> {
    const items: T[] = [];
    let cursor: string | undefined;
    let pages = 0;

    while (items.length < wantTotal && pages < maxPages) {
      const limit = Math.min(PAGE_LIMIT, Math.max(1, wantTotal - items.length));
      const page = await this.page<T>(path, {
        ...options,
        query: {
          ...options.query,
          limit: Number.isFinite(wantTotal) ? limit : PAGE_LIMIT,
          cursor,
        },
      });
      items.push(...page.items);
      pages += 1;
      if (!page.nextCursor || page.items.length === 0) break;
      cursor = page.nextCursor;
    }

    return {
      items: Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items,
      nextCursor: cursor,
    };
  }
}

/**
 * Turn a Fivetran error into something actionable.
 *
 * The three worth explaining are the ones whose obvious reading is wrong: a
 * `406` is the Accept header rather than anything about the request, a `409`
 * on a re-sync means a sync is already running rather than that the connection
 * is broken, and a `429` carries a real `Retry-After`.
 */
export function describeError(status: number, text: string, headers?: Headers): string {
  let detail = text.slice(0, 300);
  let code: string | undefined;
  try {
    const body = JSON.parse(text) as { code?: string; message?: string };
    code = body?.code;
    detail = body?.message ?? code ?? detail;
    if (code && body?.message) detail = `${detail} (${code})`;
  } catch { /* not JSON */ }

  if (status === 406) {
    return `${detail} — Fivetran did not accept the Accept header. This app sends ` +
      `\`${API_VERSION}\`; a bare \`application/json\` is what usually causes this`;
  }
  if (status === 409) {
    return `${detail} — a sync is already running on this connection. Fivetran declines a ` +
      "re-sync rather than queueing it, so wait for the current sync or force it";
  }
  if (status === 429) {
    const after = headers?.get("retry-after") ?? undefined;
    const limit = headers?.get("x-rate-limit") ?? undefined;
    return `${detail} — rate limited${after ? `, retry after ${after}s` : ""}${
      limit ? ` (limit ${limit}/hour)` : ""
    }. A TRIAL account is capped at 500 requests an hour against 20,000 on a paid plan, which is ` +
      "40 times tighter and the usual surprise";
  }
  if (status === 401 || status === 403) {
    return `${detail} — check the API key and secret. Fivetran issues scoped keys tied to a user, ` +
      "service account keys, and org-level system keys, and they reach different things";
  }
  return detail || `${status}`;
}
