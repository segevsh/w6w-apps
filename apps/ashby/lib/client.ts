import type { HookContext } from "@w6w/types";

/**
 * Ashby's public API — verified against the OpenAPI fragments Ashby publishes
 * per endpoint under `developers.ashbyhq.com/reference/<endpoint>.md`, and its
 * documentation index at `developers.ashbyhq.com/llms.txt` (fetched
 * 2026-08-18).
 *
 * ## Three conventions decide how this whole app is written
 *
 * ### 1. An error arrives as `200 OK`
 *
 * This is the one to internalise. Ashby's own words: *"What would be `4XX`
 * errors will return `200` with `success` being `false`."* The body carries
 *
 * ```json
 * {"success": false,
 *  "errorInfo": {"code": "application_not_found",
 *                "message": "Application not found - are you lacking permissions…",
 *                "requestId": "01JSJ8FEK5ZN4XQBZP7DBKK7ZC"}}
 * ```
 *
 * A client that branches on `res.ok` therefore reports every business failure —
 * a missing candidate, a rejected stage move, a permission the key does not
 * have — as a success, and hands the next step an empty result. So `request()`
 * checks `success` first and the HTTP status second, and the `requestId` is
 * carried into the error because it is what Ashby support asks for.
 *
 * ### 2. Everything is POST, including reads
 *
 * `POST https://api.ashbyhq.com/<resource>.<verb>` with a JSON body. There are
 * no query strings and no GETs, so "read" actions here still send a body. Auth
 * is HTTP Basic with **the API key as the username and an empty password**, and
 * `Accept: application/json; version=1` pins the response shape.
 *
 * ### 3. The verb in the name tells you what you get
 *
 *   - **`.info`** — one record.
 *   - **`.list`** — every record, paginated, meant for syncing.
 *   - **`.search`** — matches for a specific lookup, **not paginated**, capped.
 *   - **`.<action>`** — does something and returns the updated record.
 *
 * `.list` and `.search` look interchangeable and are not: searching is for
 * "find this person", listing is for "walk the whole collection".
 */
export const BASE_URL = "https://api.ashbyhq.com";

/** Ashby pins the response shape to a version, and this is the only one. */
export const API_VERSION = "application/json; version=1";

/** Every paginated endpoint caps a page at 100. */
export const PAGE_LIMIT = 100;

export interface RequestOptions {
  /** The JSON body. Ashby takes no query string at all. */
  body?: Record<string, unknown>;
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

/**
 * Ashby uses **two different time formats in the same API**, and mixing them up
 * fails quietly rather than loudly.
 *
 *   - **Filters** — `createdAfter`, `createdBefore`, `openedAfter` … take
 *     **Unix milliseconds**. An ISO string here is not rejected; it is
 *     coerced, and the filter silently matches nothing or everything.
 *   - **Values you set** — `createdAt` on a candidate, note or application —
 *     take an **ISO date string**.
 *
 * So a filter param is always passed through this, and a value param never is.
 */
export function epochMillis(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return value;
  const text = String(value).trim();
  if (/^\d+$/.test(text)) return Number(text);
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) {
    throw new Error(`\`${field}\` is not a date Ashby can filter on: ${text}`);
  }
  return parsed;
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

/** What a paginated `.list` gives back. */
export interface ListPage<T> {
  items: T[];
  /** Pass as `cursor` next call. Absent at the end. */
  nextCursor?: string;
  moreDataAvailable: boolean;
  /**
   * Present only on the LAST page of a sync-capable list. Store it and pass it
   * next run to fetch only what changed.
   */
  syncToken?: string;
  /** Ashby's own "this mostly worked" signals, never dropped silently. */
  warnings: string[];
}

interface Envelope<T> {
  success?: boolean;
  results?: T;
  errorInfo?: { code?: string; message?: string; requestId?: string };
  moreDataAvailable?: boolean;
  nextCursor?: string;
  syncToken?: string;
  warnings?: string[];
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class AshbyClient {
  constructor(private ctx: HookContext) {}

  /** POST one endpoint and unwrap `results`, raising on `success: false`. */
  async request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { results } = await this.envelope<T>(endpoint, options);
    return results as T;
  }

  /** The whole envelope, for callers that need `warnings` or paging fields. */
  async envelope<T = unknown>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<Envelope<T>> {
    const res = await this.ctx.fetch(`${BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: { accept: API_VERSION, "content-type": "application/json" },
      body: JSON.stringify(options.body ?? {}),
    });
    const text = await res.text().catch(() => "");

    // A transport-level failure — 401, 403, 429, 5xx — still happens; it is the
    // 4xx-shaped failures that arrive as 200.
    if (!res.ok) {
      throw new Error(
        `Ashby ${res.status} for ${endpoint}: ${describeHttpError(res.status, text)}`,
      );
    }

    let body: Envelope<T>;
    try {
      body = JSON.parse(text || "{}") as Envelope<T>;
    } catch {
      throw new Error(`Ashby returned a non-JSON body for ${endpoint}: ${text.slice(0, 200)}`);
    }

    // The check that matters. `success: false` inside a 200 is the normal way
    // Ashby reports a failure.
    if (body?.success === false) {
      const info = body.errorInfo ?? {};
      const parts = [info.message ?? info.code ?? "no error message"];
      if (info.code && info.message) parts.push(`(${info.code})`);
      if (info.requestId) parts.push(`[requestId ${info.requestId}]`);
      throw new Error(`Ashby refused ${endpoint}: ${parts.join(" ")}`);
    }

    // Ashby's own words for "this worked, but not entirely". Dropping them is
    // how a partially-applied write looks like a clean one.
    const warnings = body?.warnings ?? [];
    if (warnings.length > 0) {
      this.ctx.log("warn", `Ashby accepted ${endpoint} with warnings`, { warnings });
    }
    return body;
  }

  /** One page of a `.list`, with its cursor, sync token and warnings. */
  async page<T = unknown>(
    endpoint: string,
    body: Record<string, unknown> = {},
  ): Promise<ListPage<T>> {
    const env = await this.envelope<T[]>(endpoint, { body });
    return {
      items: Array.isArray(env.results) ? env.results : [],
      nextCursor: env.nextCursor ?? undefined,
      moreDataAvailable: env.moreDataAvailable === true,
      syncToken: env.syncToken ?? undefined,
      warnings: env.warnings ?? [],
    };
  }

  /**
   * Follow `nextCursor` to the end, or until `wantTotal` rows are collected.
   *
   * ## The sync token only appears on the last page
   *
   * Ashby's docs are explicit: the `syncToken` is *"provided in the response
   * or, for paginated lists, on the last page of results."* So a loop that
   * stops early — because it hit a limit, or a page ceiling — has **no token**,
   * and the next run has no choice but to sync everything again.
   *
   * That is a real trade-off rather than a bug, so it is surfaced: the caller
   * gets `syncToken` when the walk genuinely finished and `undefined` when it
   * did not, and the actions say which.
   */
  async pageAll<T = unknown>(
    endpoint: string,
    body: Record<string, unknown> = {},
    wantTotal = Infinity,
    maxPages = 50,
  ): Promise<ListPage<T>> {
    const items: T[] = [];
    let cursor: string | undefined = body.cursor as string | undefined;
    let syncToken: string | undefined;
    let moreDataAvailable = false;
    const warnings: string[] = [];
    let pages = 0;

    while (items.length < wantTotal && pages < maxPages) {
      const limit = Math.min(PAGE_LIMIT, Math.max(1, wantTotal - items.length));
      const page: ListPage<T> = await this.page<T>(endpoint, {
        ...body,
        cursor,
        limit: Number.isFinite(wantTotal) ? limit : PAGE_LIMIT,
      });
      items.push(...page.items);
      warnings.push(...page.warnings);
      pages += 1;
      moreDataAvailable = page.moreDataAvailable;
      syncToken = page.syncToken ?? syncToken;
      if (!page.moreDataAvailable || !page.nextCursor) break;
      cursor = page.nextCursor;
    }

    return {
      items: Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items,
      nextCursor: cursor,
      moreDataAvailable,
      // Only meaningful if the walk actually reached the end.
      syncToken: moreDataAvailable ? undefined : syncToken,
      warnings,
    };
  }
}

/**
 * The transport-level failures, which are the minority here.
 *
 * `401` is a missing key and `403` is a key that exists but is deactivated or
 * lacks the endpoint's permission — a distinction Ashby draws explicitly, and
 * one worth keeping because the fixes are different.
 */
export function describeHttpError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as { errorInfo?: { message?: string; code?: string } };
    detail = body?.errorInfo?.message ?? body?.errorInfo?.code ?? detail;
  } catch { /* Ashby answers these in plain text */ }

  if (status === 401) return `${detail || "Unauthorized"} — no API key reached Ashby`;
  if (status === 403) {
    return `${detail || "Forbidden"} — the key is deactivated, or lacks the permission this ` +
      "endpoint needs. Ashby scopes keys per module (Jobs, Candidates, Interviews, Offers, …) " +
      "and the scope is granted in the Ashby app, not here";
  }
  if (status === 429) {
    return `${detail || "Too Many Requests"} — Ashby rate limits the report endpoints at 15 ` +
      "requests per minute per organization, with at most 3 report operations at once";
  }
  return detail || `${status}`;
}
