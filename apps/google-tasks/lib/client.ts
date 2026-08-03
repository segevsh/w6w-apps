import type { HookContext } from "@w6w/types";

/**
 * Google Tasks API v1.
 *
 * The service endpoint is `tasks.googleapis.com` (NOT `www.googleapis.com`,
 * which is what Calendar/Drive/Sheets use), and the version prefix `/tasks/v1`
 * is part of the path, so the full base is the two concatenated. Verified
 * against https://developers.google.com/workspace/tasks/reference/rest.
 */
export const API_URL = "https://tasks.googleapis.com/tasks/v1";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON object → JSON-encoded body. `undefined`/`null` → no body. */
  body?: unknown;
  /** Additional request headers. */
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`. Auth is applied by the runtime through the
 * auth `sign` hook, so we never touch the Authorization header here.
 */
export class GoogleTasksClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    let body: BodyInit | undefined;
    if (options.body !== undefined && options.body !== null) {
      headers["content-type"] = "application/json";
      body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    const init: RequestInit = { method: options.method ?? "GET", headers, body };
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Google Tasks ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    // `tasks.delete`, `tasklists.delete` and `tasks.clear` all document an empty
    // response body. Read as text first so an empty 200 is as safe as a 204.
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/**
 * Task list and task identifiers are opaque, server-issued strings that appear
 * as single path segments. Percent-encode once so an id can never break out of
 * its segment.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(id);
}
