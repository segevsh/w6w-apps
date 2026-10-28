import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.typesafe.ai/v1";

export interface RequestOptions {
  method?: string;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets Authorization — the runtime routes
 * the request through the auth `sign` hook, which injects the Bearer header.
 */
export class JevClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${API_URL}${path}`;
    const init: RequestInit = { method: options.method ?? "GET", headers: {} };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url, init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Jev ${res.status} ${res.statusText} for ${options.method ?? "GET"} ${path}: ${detail}`,
      );
    }
    return res.json() as Promise<T>;
  }
}
