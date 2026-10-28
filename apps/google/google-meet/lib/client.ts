import type { HookContext } from "@w6w/types";

export const API_URL = "https://meet.googleapis.com/v2";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";

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
 * auth `sign` hook, so we never touch Authorization here.
 *
 * Note on encoding: Meet resource names are already-safe path segments —
 * `spaces/{space}`, `conferenceRecords/{cr}/participants/{p}` and friends use
 * only `[A-Za-z0-9_-]` and `/`, so no `@`-style percent-encoding helper (as
 * Calendar's calendar IDs need) is required. Callers hand us the raw resource
 * name and a plain `URL` join round-trips it unchanged. The one path suffix
 * that is not a plain segment — `spaces/{space}:endActiveConference` — is a
 * custom method colon, which `URL#pathname` also preserves.
 */
export class GoogleMeetClient {
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
        `Google Meet ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}
