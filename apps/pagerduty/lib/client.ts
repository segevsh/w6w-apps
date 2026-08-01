import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.pagerduty.com";

/**
 * PagerDuty's versioning header. Every REST API response is shaped by this —
 * omitting it still works today but is not the documented contract.
 * Source: https://developer.pagerduty.com/docs/authentication
 */
export const ACCEPT_HEADER = "application/vnd.pagerduty+json;version=2";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: Record<string, unknown>;
  /**
   * The email of a valid user on the account, sent as the `From` header.
   * PagerDuty requires this on every incident-mutating call (create, manage,
   * add a note) so it can attribute the change to a user — see
   * https://developer.pagerduty.com/docs/authentication (the `From` header)
   * and the `from_header` parameter on those endpoints in PagerDuty's OpenAPI
   * schema (https://github.com/PagerDuty/api-schema).
   */
  from?: string;
}

/** Drop keys the caller left unset so a PUT/POST doesn't send empty fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class PagerDutyClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        // PagerDuty's array query params use the `key[]=a&key[]=b` form.
        for (const item of v) url.searchParams.append(`${k}[]`, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: ACCEPT_HEADER };
    if (options.from) headers["from"] = options.from;
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // PagerDuty returns { error: { message, errors: [...] } } — surface both,
      // they are the difference between "bad token" and "field is required".
      const detail = await res.text().catch(() => "");
      throw new Error(
        `PagerDuty ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * PagerDuty's offset pagination: each page carries `more` (whether another
   * page follows) and the collection under `collectionKey`. `limit` is the
   * PAGE size on the wire (max 100); pass `wantTotal` to cap the number of
   * items returned to the caller — `Infinity` (the default) collects every
   * page.
   */
  async requestAll<T = unknown>(
    path: string,
    collectionKey: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let offset = 0;
    const pageSize = 100;
    while (items.length < wantTotal) {
      const page = await this.request<Record<string, unknown>>(path, {
        ...options,
        query: { ...options.query, limit: pageSize, offset },
      });
      const chunk = (page[collectionKey] as T[] | undefined) ?? [];
      items.push(...chunk);
      if (!page.more || chunk.length === 0) break;
      offset += pageSize;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
