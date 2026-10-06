import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.x.ai";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/** xAI's error envelope: `{ "code": "...", "error": "..." }`. */
export interface XaiError {
  code?: string;
  error?: string;
}

/**
 * Drop undefined/null/empty-string entries so optional params never reach the wire as
 * `null` (the vendor treats an explicit null differently from an absent field on some models).
 */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** Parse a JSON-or-JSON-string param; a malformed string throws a clear error. */
export function parseJson(name: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets Authorization — the runtime routes the request
 * through the auth `sign` hook, which injects the Bearer header.
 *
 * Failures carry the vendor's own `code` (e.g. `unauthenticated:no-credentials`,
 * `invalid-argument`) rather than only the HTTP status: xAI answers a wrong key with 400
 * `invalid-argument`, not 401, so the status alone misleads.
 */
export class XaiClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
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
      let code = "";
      try {
        code = (JSON.parse(detail) as XaiError).code ?? "";
      } catch { /* not JSON */ }
      throw new Error(
        `xAI ${res.status}${code ? ` [${code}]` : ""} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) return res.json() as Promise<T>;
    return res.text() as unknown as Promise<T>;
  }
}
