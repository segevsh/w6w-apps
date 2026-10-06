import type { HookContext } from "@w6w/types";

/**
 * Aidbase API client.
 *
 * Verified 2026-10-06 against the Aidbase API reference (docs.aidbase.ai/apis/*, base
 * `https://api.aidbase.ai/v1`) plus unauthenticated live probes of `api.aidbase.ai`.
 *
 * ## Shapes
 *
 * - Every response is `{ success, data }`; a failure is `{ success: false, message }`. The
 *   HTTP status is a hint only: {@link AidbaseClient} throws on a non-2xx status AND on a 2xx
 *   whose body says `success: false`.
 * - Knowledge, chats, emails and tickets are paginated: `data` is
 *   `{ items, total, has_more, next_cursor? }` and the next page is `?next_cursor=<cursor>`
 *   (`?limit=` sets the page size, default 25). {@link AidbaseClient.page} returns the same
 *   thing under camelCase names.
 * - The three "list my chatbots / inboxes / forms" endpoints are NOT paginated: `data` is a
 *   bare array. {@link AidbaseClient.array} wraps it as `{ items, count }`.
 * - Writes that return no `data` (`{ "success": true }`) come back as `{ ok: true }`.
 * - The credential is never built here: only the Auth `sign` hook adds `Authorization`.
 */

export const API_BASE = "https://api.aidbase.ai/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Headers every request carries. The credential is not here — only `sign` adds it. */
export function baseHeaders(): Record<string, string> {
  return { accept: "application/json" };
}

/** Escape a path segment. */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id).trim());
}

/** Drop undefined / null / empty-string / empty-array entries. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

export function queryString(query: Record<string, QueryValue> = {}): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(compact(query))) sp.append(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** A comma-separated string or an array -> trimmed, non-empty strings; undefined when empty. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const list = (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return list.length ? list : undefined;
}

/** Aidbase's `{ success: false, message }` body, as one string. */
export function errorText(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  for (const k of ["message", "error"]) {
    if (typeof b[k] === "string" && b[k]) return b[k] as string;
  }
  return undefined;
}

export class AidbaseClient {
  constructor(private ctx: HookContext) {}

  /** `data` of a single-object response. */
  async object(path: string, opts: RequestOptions = {}): Promise<Record<string, unknown>> {
    const data = await this.send(path, opts);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error(`Aidbase: expected an object in "data" from ${path}`);
    }
    return data as Record<string, unknown>;
  }

  /** A write with no useful body: `{ ok: true }`, merged with `data` if it is an object. */
  async done(path: string, opts: RequestOptions = {}): Promise<Record<string, unknown>> {
    const data = await this.send(path, opts);
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return { ok: true, ...(data as Record<string, unknown>) };
    }
    return { ok: true };
  }

  /** `GET /status`: only the documented `status` leaves the app (the masked key is dropped). */
  async status(path: string, opts: RequestOptions = {}): Promise<Record<string, unknown>> {
    const data = await this.object(path, opts);
    return { status: data.status };
  }

  /** A bare-array `data` -> `{ items, count }`. */
  async array(path: string, opts: RequestOptions = {}): Promise<Record<string, unknown>> {
    const data = await this.send(path, opts);
    if (!Array.isArray(data)) throw new Error(`Aidbase: expected an array in "data" from ${path}`);
    return { items: data, count: data.length };
  }

  /** `{ items, total, has_more, next_cursor }` -> camelCase page. */
  async page(path: string, opts: RequestOptions = {}): Promise<Record<string, unknown>> {
    const data = await this.send(path, opts) as Record<string, unknown> | null;
    const items = data?.items;
    if (!Array.isArray(items)) throw new Error(`Aidbase: expected "items" from ${path}`);
    const more = data?.has_more === true;
    const cursor = typeof data?.next_cursor === "string" && data.next_cursor
      ? data.next_cursor
      : null;
    return {
      items,
      total: typeof data?.total === "number" ? data.total : items.length,
      hasMore: more,
      nextCursor: more ? cursor : null,
      count: items.length,
    };
  }

  private async send(path: string, opts: RequestOptions): Promise<unknown> {
    const headers = baseHeaders();
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(`${API_BASE}${path}${queryString(opts.query)}`, {
      method: opts.method ?? "GET",
      headers,
      body,
    });
    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        if (res.ok) throw new Error(`Aidbase ${res.status}: response was not JSON`);
      }
    }
    const failed = !res.ok ||
      (!!parsed && typeof parsed === "object" &&
        (parsed as { success?: unknown }).success === false);
    if (failed) {
      const msg = errorText(parsed) ?? (text ? text.slice(0, 300) : res.statusText);
      throw new Error(`Aidbase ${res.status}${msg ? `: ${msg}` : ""}`);
    }
    return (parsed as { data?: unknown } | null)?.data;
  }
}
