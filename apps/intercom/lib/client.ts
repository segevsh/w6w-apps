import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.intercom.io";

/**
 * Intercom pins behaviour to an API version via the `Intercom-Version` header.
 * Without it a workspace is served whichever version it was created against,
 * so every request sends an explicit, recent stable version to keep response
 * shapes predictable. Bump deliberately after re-checking the endpoints below.
 */
export const INTERCOM_VERSION = "2.11";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Intercom's list endpoints paginate with a cursor: responses carry
 * `pages.next.starting_after` (list APIs) which is passed back as
 * `starting_after` on the next request. When `pages.next` is absent there are
 * no more pages.
 */
export interface IntercomPages {
  next?: { starting_after?: string } | string | null;
  page?: number;
  per_page?: number;
  total_pages?: number;
}

export interface IntercomList<T = unknown> {
  type?: string;
  data?: T[];
  pages?: IntercomPages;
  total_count?: number;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook, which injects the Bearer
 * token. It does set `Accept` and `Intercom-Version`, which are not credential
 * material and must ride on every call.
 */
export class IntercomClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      "accept": "application/json",
      "intercom-version": INTERCOM_VERSION,
    };
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
        `Intercom ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return res.json() as Promise<T>;
    }
    return res.text() as unknown as Promise<T>;
  }
}

/**
 * Drop `undefined` / `null` / `""` entries from a body so callers can spread
 * optional inputs without a conditional per field. Intercom treats an explicit
 * `null` as "clear this attribute" on update, so only omit — never coerce.
 */
export function compact(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}
