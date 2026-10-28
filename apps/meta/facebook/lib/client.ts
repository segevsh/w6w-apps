import type { HookContext } from "@w6w/types";

/**
 * Pinned to Graph API v23.0.
 *
 * Checked 2026-08-02 against developers.facebook.com/docs/graph-api/changelog/versions/:
 * the active window at the time ran from v19.0 (sunsetting 2026-05-21) through the
 * newly-shipped v26.0 (2026-07-29). v23.0 sits solidly in the middle of that window —
 * every endpoint this app calls (page, page-post, comments, photos, videos, insights,
 * ad-account campaigns) is documented unchanged at that version — with a support
 * runway well past v19/v20's near-term sunset, while avoiding a version that shipped
 * only days before this app was written. Bump `API_URL` when v23.0 approaches its own
 * two-year sunset.
 */
export const API_URL = "https://graph.facebook.com/v23.0";

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
  /**
   * Every parameter the Graph API takes — for `GET` reads and for `POST`/`DELETE`
   * writes alike — travels as a query-string parameter, never a JSON (or even
   * form-urlencoded) request body. Meta's own reference examples show writes as
   * `POST /{page-id}/feed?message=...&access_token=...`, curl-verbatim (checked
   * 2026-08-02 against developers.facebook.com/docs/graph-api/reference/.../feed).
   * `access_token` itself is never set here — the runtime routes every request
   * through the auth `sign` hook, which stamps `Authorization: Bearer <token>`
   * instead (Graph API accepts either form).
   */
  params?: Record<string, string | number | boolean | undefined | null>;
}

interface FacebookErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization: the runtime routes
 * every request through the auth `sign` hook, which is the only code handed the
 * credential. Page-scoped endpoints (posting, comments, photos, videos, insights)
 * need a Page access token — connect with the `page-token` auth method, or a User
 * token carrying the matching `pages_*` scopes.
 */
export class FacebookClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.params) {
      for (const [k, v] of Object.entries(options.params)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const res = await this.ctx.fetch(url.toString(), {
      method: options.method ?? "GET",
      headers: { accept: "application/json" },
    });

    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = undefined;
    }

    if (!res.ok) {
      const detail = (parsed as FacebookErrorBody | undefined)?.error?.message ??
        (text || res.statusText);
      throw new Error(
        `Facebook ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    return parsed as T;
  }
}
