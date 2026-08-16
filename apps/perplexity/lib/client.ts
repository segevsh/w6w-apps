import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.perplexity.ai";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets Authorization — the runtime routes
 * the request through the auth `sign` hook, which injects the Bearer header.
 */
export class PerplexityClient {
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
      const detail = await extractError(res);
      throw new Error(
        `Perplexity ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

/**
 * Perplexity's error body is `{ error: { message, type, code } }` on every
 * endpoint probed (401 on `/v1/sonar`, `/search`, `/v1/embeddings`, `/v1/models`).
 * Fall back to the raw text when a response doesn't match, rather than hiding it.
 */
export async function extractError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const body = JSON.parse(text) as { error?: { message?: string; type?: string } };
    if (body?.error?.message) {
      return body.error.type ? `${body.error.message} (${body.error.type})` : body.error.message;
    }
  } catch {
    // not JSON — fall through to the raw text
  }
  return text;
}
