import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.box.com/2.0";
export const UPLOAD_URL = "https://upload.box.com/api/2.0";

/**
 * Box splits its API across two hosts: `api.box.com` handles every JSON
 * endpoint (files/folders metadata, create, delete, search, sharing) while
 * `upload.box.com` handles the multipart file-upload endpoint. Both accept
 * the same Bearer token — the auth `sign` hook injects it, we never set
 * Authorization here.
 *
 * `GET /files/{id}/content` (download) is on `api.box.com` too, but Box
 * answers it with a 302 redirect to a `dl*.boxcloud.com` host that varies
 * per request. That redirect is followed transparently by the underlying
 * `fetch()` the host performs on the app's behalf (a single logical
 * `ctx.fetch` call from this app's point of view) — the runtime's egress
 * allowlist only inspects the request's own hostname, not hosts visited
 * along a redirect chain, so `*.boxcloud.com` need not (and cannot cleanly)
 * be declared in `w6w.network.allow`.
 */

export type QueryValue = string | number | boolean | undefined;

export interface RequestOptions {
  method?: string;
  /** Query string params. `undefined`/`""` values are omitted. */
  query?: Record<string, QueryValue>;
  /** JSON body — will be JSON.stringified and sent with content-type application/json. */
  body?: unknown;
  /**
   * Pre-encoded string body (e.g. a hand-built multipart/form-data payload).
   * Takes precedence over `body`. Callers set their own `content-type` via
   * `headers` when using this.
   */
  rawBody?: string;
  /** Extra headers to merge into the request. */
  headers?: Record<string, string>;
  /** When true, return the raw Response instead of a parsed body (used by download). */
  raw?: boolean;
}

function withQuery(url: string, query?: Record<string, QueryValue>): string {
  if (!query) return url;
  const u = new URL(url);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") continue;
    u.searchParams.set(key, String(value));
  }
  return u.toString();
}

/**
 * Thin wrapper over `ctx.fetch`. Note we never set Authorization here — the
 * runtime routes the request through the auth `sign` hook, which injects it.
 */
export class BoxClient {
  constructor(private ctx: HookContext) {}

  /** Full URL builder. Callers pass either an absolute URL or a path relative to `API_URL`. */
  private resolveUrl(path: string): string {
    if (path.startsWith("http")) return path;
    return `${API_URL}${path}`;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = withQuery(this.resolveUrl(path), options.query);
    const method = options.method ?? "GET";
    const headers: Record<string, string> = { ...(options.headers ?? {}) };

    let body: string | undefined;
    if (options.rawBody !== undefined) {
      body = options.rawBody;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url, { method, headers, body });
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Box ${res.status} ${res.statusText} for ${method} ${url}: ${detail}`,
      );
    }
    if (options.raw) return res as unknown as T;
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}
