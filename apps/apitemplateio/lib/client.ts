import type { HookContext } from "@w6w/types";

export const API_URL = "https://rest.apitemplate.io";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets X-API-KEY — the runtime routes
 * the request through the auth `sign` hook, which injects that header.
 */
export class ApiTemplateClient {
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
    const contentType = res.headers.get("content-type") ?? "";
    const parsed = contentType.includes("application/json") ? await res.json() : await res.text();

    if (!res.ok) {
      const detail = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
      throw new Error(
        `APITemplate.io ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    // The API reports its own failures with HTTP 200 and `status: "error"`.
    if (
      parsed && typeof parsed === "object" && (parsed as { status?: string }).status === "error"
    ) {
      throw new Error(
        `APITemplate.io reported an error for ${options.method ?? "GET"} ${url.pathname}: ${
          (parsed as { message?: string }).message ?? "unknown error"
        }`,
      );
    }
    return parsed as T;
  }
}
