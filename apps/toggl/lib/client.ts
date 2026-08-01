import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.track.toggl.com/api/v9";

/**
 * Identifies this integration to Toggl. Required by the create-time-entry
 * payload (`created_with`) — an app identifier, not user data, so it is a
 * constant rather than a param.
 */
export const CREATED_WITH = "w6w";

/**
 * Formats a `Date` the way Toggl's time-entry payload wants it: UTC,
 * `2006-01-02T15:04:05Z` (RFC 3339 without fractional seconds).
 */
export function toTogglTime(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime
 * routes the request through the auth `sign` hook, which stamps
 * `Basic base64(apiToken:api_token)` per Toggl's own Basic-auth convention
 * (see `auth/api-token.ts`).
 */
export class TogglClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const init: RequestInit = { method: options.method ?? "GET", headers: {} };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch {
        // ignore — report the status alone.
      }
      throw new Error(
        `Toggl ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    // Delete/stop-adjacent endpoints can answer 200 or 204 with no body.
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return JSON.parse(text) as T;
    }
    return text as unknown as T;
  }
}
