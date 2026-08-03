import type { HookContext } from "@w6w/types";

/**
 * The CURRENT MailerLite API. MailerLite runs two generations side by side:
 *
 *   - `connect.mailerlite.com/api`     — this one. Bearer token.
 *   - `api.mailerlite.com/api/v2`      — the Classic API, `X-MailerLite-ApiKey`
 *                                        header. Still live, separately
 *                                        documented, and NOT what this app talks
 *                                        to.
 *
 * See the app README for the full note on which is which.
 */
export const API_URL = "https://connect.mailerlite.com/api";

/**
 * Nearly every MailerLite response is the same three-key envelope: `data`
 * (object for a single resource, array for a collection), `links` (page URLs)
 * and `meta` (page counters, plus `next_cursor` / `prev_cursor` on the
 * cursor-paginated collections).
 *
 * Two collections page differently and the difference is load-bearing:
 *
 *   - subscribers, group subscribers and form subscribers use an OPAQUE
 *     `cursor` (read `meta.next_cursor`, pass it back as `cursor`);
 *   - groups, fields, segments, campaigns and automations use `page` + `limit`.
 *
 * Actions surface the whole envelope so a caller can drive its own pagination
 * without a second call.
 */
export interface MailerLiteEnvelope<T = unknown> {
  data?: T;
  links?: {
    first?: string | null;
    last?: string | null;
    prev?: string | null;
    next?: string | null;
  };
  meta?: Record<string, unknown>;
}

export interface RequestOptions {
  method?: string;
  /** Bracketed keys (`filter[status]`) are passed through verbatim. */
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Note we never set an auth header here — the
 * runtime routes the request through the auth `sign` hook, which injects the
 * bearer token.
 */
export class MailerLiteClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(
      path.startsWith("http") ? path : `${API_URL}${path.startsWith("/") ? path : `/${path}`}`,
    );
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
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
        `MailerLite ${res.status} ${res.statusText} for ${method} ${url.pathname}: ${detail}`,
      );
    }
    // 204 No Content is the documented success for every DELETE.
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (text.length === 0) return undefined as T;
    return JSON.parse(text) as T;
  }
}
