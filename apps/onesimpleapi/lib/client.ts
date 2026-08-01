import type { HookContext } from "@w6w/types";

export const API_URL = "https://onesimpleapi.com/api";

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets the `token` query param — the
 * runtime routes the request through the auth `sign` hook, which injects it.
 *
 * Every request asks for `output=json` so responses are always structured
 * data, never the vendor's plain-text/redirect/CSV output modes.
 *
 * ## The invalid-token quirk
 *
 * OneSimpleApi does not answer a missing/invalid/under-scoped token with a
 * JSON 401/403. It 302-redirects to `https://onesimpleapi.com/login`, and
 * that login page itself responds HTTP 200 with `text/html` — verified
 * 2026-08-01 with `curl -L` against `/api/exchange_rate?token=invalid`. A
 * client that only checked `res.ok` would treat that as success and hand
 * back a page of HTML instead of the data it asked for. So this client
 * checks `content-type` first: a JSON request that comes back as anything
 * other than `application/json` is treated as an error regardless of HTTP
 * status.
 */
export class OneSimpleApiClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    url.searchParams.set("output", "json");
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const res = await this.ctx.fetch(url.toString());
    const contentType = res.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      throw new Error(
        `OneSimpleApi did not return JSON for GET ${url.pathname} (got "${
          contentType || "no content-type"
        }", HTTP ${res.status}) — likely an invalid token, or a token missing this ` +
          `feature's permission (OneSimpleApi redirects both cases to its login page)`,
      );
    }

    const parsed = await res.json();
    if (!res.ok) {
      throw new Error(
        `OneSimpleApi ${res.status} ${res.statusText} for GET ${url.pathname}: ${
          JSON.stringify(parsed)
        }`,
      );
    }
    return parsed as T;
  }
}
