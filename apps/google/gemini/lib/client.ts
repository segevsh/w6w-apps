import type { HookContext } from "@w6w/types";

export const API_URL = "https://generativelanguage.googleapis.com/v1beta";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON body — will be stringified and content-type set to application/json. */
  body?: unknown;
  /** Extra headers merged over defaults. */
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch` for the Gemini Developer API
 * (`generativelanguage.googleapis.com`, NOT Vertex AI — see README). We never
 * set the credential header here: the runtime routes the request through the
 * auth `sign` hook, which injects `x-goog-api-key`.
 */
export class GeminiClient {
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
        `Gemini ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

/** Normalize a bare model id (`gemini-3.5-flash`) or `models/…` name into `models/…`. */
export function modelResource(model: string): string {
  return model.startsWith("models/") ? model : `models/${model}`;
}
