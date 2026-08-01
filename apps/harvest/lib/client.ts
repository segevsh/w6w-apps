import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.harvestapp.com/v2";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` or
 * `Harvest-Account-Id` — the runtime routes the request through the auth
 * `sign` hook, which injects both (identical shape for the personal-access-
 * token and OAuth2 methods: a bearer token plus the account id header every
 * Harvest API v2 request requires).
 */
export class HarvestClient {
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
        `Harvest ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    // Delete endpoints answer 200 or 204 with no body.
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
