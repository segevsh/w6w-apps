import type { HookContext } from "@w6w/types";

export const API_BASE = "https://api.baremetrics.com";
export const API_PREFIX = "/v1";

/** Percent-encode one path segment (oids are the caller's own strings and may hold anything). */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id));
}

/**
 * Accept a JSON array either as a real array or as the JSON text a form field
 * produces. Anything else passes through untouched so the vendor, not this
 * app, rejects it.
 */
export function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export type Query = Record<string, string | number | boolean | string[] | undefined | null>;

export interface RequestOptions {
  query?: Query;
  body?: Record<string, unknown>;
}

/** Build `?a=1&b=2`, skipping unset, null and empty values. */
export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** The vendor's error text. Baremetrics answers `{"error": "…"}`; `errors` is tolerated too. */
export function errorText(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const rec = body as Record<string, unknown>;
  const e = rec.error ?? rec.errors ?? rec.message;
  if (typeof e === "string") return e;
  if (e !== undefined && e !== null) return JSON.stringify(e);
  return undefined;
}

/**
 * Thin client over `https://api.baremetrics.com/v1`. Credentials are never
 * handled here: the runtime routes every `ctx.fetch` through the Auth `sign`
 * hook, which stamps `Authorization: Bearer <key>`.
 */
export class BaremetricsClient {
  constructor(private readonly ctx: HookContext) {}

  async request(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<unknown> {
    const url = `${API_BASE}${API_PREFIX}${path}${buildQuery(options.query)}`;
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url, init);
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text.trim() !== "") {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
    }

    if (!res.ok) {
      const detail = errorText(parsed) ?? (text.trim().slice(0, 200) || res.statusText);
      throw new Error(`Baremetrics ${method} ${path} failed: HTTP ${res.status} — ${detail}`);
    }
    // A delete may answer with an empty body; hand back an object either way.
    return parsed ?? {};
  }
}
