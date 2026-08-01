import type { HookContext } from "@w6w/types";

export const API_URL = "https://api-ssl.bitly.com/v4";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. As with the other apps we never set
 * Authorization here — the runtime routes the request through the auth
 * `sign` hook, which injects it.
 */
export class BitlyClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json" };
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
        `Bitly ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

/** The Bitlink object shape common to create / get / update responses. */
export interface Bitlink {
  id: string;
  link: string;
  long_url: string;
  title?: string;
  archived?: boolean;
  created_at?: string;
  created_by?: string;
  custom_bitlinks?: string[];
  tags?: string[];
  deeplinks?: unknown[];
  references?: Record<string, string>;
}
