import type { HookContext } from "@w6w/types";

export const API_URL = "https://coda.io/apis/v1";

/**
 * Coda paginates every list endpoint the same way: pass `pageToken` (+
 * whatever filters the endpoint supports), get back `items`, an optional
 * `nextPageToken` to keep walking, and a convenience `nextPageLink` that
 * already carries the token. We surface the raw envelope and let the caller
 * decide whether to walk it.
 */
export interface CodaListResponse<T = unknown> {
  items: T[];
  href?: string;
  nextPageToken?: string;
  nextPageLink?: string;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. As with the other apps we never set
 * Authorization here — the runtime routes the request through the auth
 * `sign` hook, which injects it.
 */
export class CodaClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
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
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Coda ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

/** A single cell write: `column` is a column ID or name, `value` is arbitrary JSON. */
export interface CodaCell {
  column: string;
  value: unknown;
}

/** Convert a caller-friendly `{ columnIdOrName: value }` map into Coda's `cells` array. */
export function toCells(row: Record<string, unknown>): CodaCell[] {
  return Object.entries(row).map(([column, value]) => ({ column, value }));
}
