import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.calendly.com";

/**
 * Calendly identifies objects by an absolute `uri`; several endpoints instead
 * take the object's bare UUID as a path segment. Accept either form from the
 * user and return just the UUID (the last path segment of the URI).
 */
export function uuidOf(uriOrUuid: string): string {
  const trimmed = uriOrUuid.trim().replace(/\/+$/, "");
  const slash = trimmed.lastIndexOf("/");
  return slash === -1 ? trimmed : trimmed.slice(slash + 1);
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch` for the Calendly API v2. Never sets
 * Authorization — the runtime routes the request through the auth `sign` hook,
 * which injects the `Bearer` header (a personal access token or an OAuth access
 * token, whichever the Connection uses).
 *
 * Calendly identifies every object by an absolute `uri` (e.g.
 * `https://api.calendly.com/users/AAAA`). A path beginning with `http` is passed
 * through verbatim so an action can request a resource by its `uri` directly.
 */
export class CalendlyClient {
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
      } catch { /* ignore */ }
      throw new Error(
        `Calendly ${res.status} ${res.statusText} for ${
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
