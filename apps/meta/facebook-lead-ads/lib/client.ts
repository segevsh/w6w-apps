import type { HookContext } from "@w6w/types";

/**
 * We pin to Graph API v19.0. n8n's node tracks a newer version (v21.0 at time of
 * porting) but v19.0 is the current LTS and still exposes the leadgen surface we
 * use (`/{page_id}/leadgen_forms`, `/{form_id}/leads`, `/me`).
 */
export const API_URL = "https://graph.facebook.com/v19.0";

/**
 * Facebook's list envelopes look like `{ data: T[], paging: { cursors, next? } }`.
 * We keep the type loose since actions in this app only pass paging through.
 */
export interface FacebookPaging {
  cursors?: { before?: string; after?: string };
  next?: string;
  previous?: string;
}

export interface FacebookListResponse<T = unknown> {
  data: T[];
  paging?: FacebookPaging;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization: the runtime routes
 * every request through the auth `sign` hook, which is the only code handed the
 * credential. To reach the Page-scoped leadgen endpoints, connect with the
 * `page-token` auth method rather than passing a token through an Action.
 */
export class FacebookClient {
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
        `Facebook ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}
