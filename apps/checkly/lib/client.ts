import type { HookContext } from "@w6w/types";

/**
 * Checkly's Public API — verified against the OpenAPI 3.0 document Checkly
 * serves from the API's own host (`https://api.checklyhq.com/openapi.json`,
 * 855KB, fetched 2026-08-18), whose `servers` block states
 * `https://api.checklyhq.com`.
 */
export const API_URL = "https://api.checklyhq.com";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset so a PUT does not clear untouched fields. */
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
 * Thin wrapper over `ctx.fetch`. It never sets Authorization or the account
 * header — the runtime routes every request through the auth `sign` hook, which
 * is where both live.
 */
export class ChecklyClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
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
      // Checkly's envelope is `{statusCode, error, message}` — the message is
      // the useful half ("Missing authentication"), and validation failures put
      // per-field detail there too, so the whole body is surfaced.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Checkly ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow Checkly's `limit`/`page` paging.
   *
   * **Every list endpoint answers a bare array** — no envelope, no total, no
   * next cursor. So the only way to know a page is the last one is that it came
   * back shorter than the page asked for, which is what this walk tests.
   * `page` is **1-based**; starting at 0 returns page 1 again and would
   * duplicate it.
   */
  async requestAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    while (items.length < wantTotal) {
      const limit = Math.min(100, Math.max(1, wantTotal - items.length));
      const chunk = await this.request<T[]>(path, {
        ...options,
        query: { ...options.query, limit, page },
      });
      const rows = Array.isArray(chunk) ? chunk : [];
      items.push(...rows);
      if (rows.length < limit) break;
      page += 1;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
