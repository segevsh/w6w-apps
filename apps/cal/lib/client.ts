import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.cal.com/v2";

/**
 * Cal.com versions each endpoint *group* — sometimes each endpoint —
 * independently via a `cal-api-version` request header rather than a single
 * API-wide version. Values below verified live against `cal.com/docs` on
 * 2026-08-01:
 *
 *   - Bookings: `GET /v2/bookings` (list) is `2026-05-01`; every other
 *     bookings endpoint (get/create/cancel/reschedule) is `2026-02-25`.
 *   - Event types: `2024-06-14` for both list and get.
 *   - Schedules: `2024-06-11` for list.
 *
 * `GET /v2/me` (used by auth) takes no version header at all.
 */
export const CAL_API_VERSION = {
  bookingsList: "2026-05-01",
  bookings: "2026-02-25",
  eventTypes: "2024-06-14",
  schedules: "2024-06-11",
} as const;

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null | string[]>;
  body?: unknown;
  /**
   * Cal.com versions each endpoint *group* independently via a `cal-api-version`
   * request header (e.g. `2024-06-14` for event types, `2026-02-25` for
   * bookings) — there is no single "v2" version, and omitting the header falls
   * back to an older, undocumented response shape. Every action that calls
   * `CalClient.request` supplies the value it was verified against.
   */
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch` for the Cal.com API v2. Never sets
 * Authorization — the runtime routes the request through the auth `sign` hook,
 * which injects the `Bearer` header for the connection's API key.
 */
export class CalClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        if (Array.isArray(v)) {
          if (v.length === 0) continue;
          url.searchParams.set(k, v.join(","));
        } else {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const headers: Record<string, string> = { ...options.headers };
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
        `Cal.com ${res.status} ${res.statusText} for ${
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
