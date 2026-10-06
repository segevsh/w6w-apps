import type { HookContext } from "@w6w/types";

/** `servers[0].url` from Dub's OpenAPI document. Paths are bare — no version segment. */
export const API_URL = "https://api.dub.co";

/** Percent-encode one path segment (ids, external ids and domain slugs are caller strings). */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

/**
 * Accept a list as a real array or as the comma-separated text a form field
 * produces. Empty entries are dropped; an empty result is `undefined`.
 */
export function strList(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  const items = Array.isArray(value) ? value.map(String) : String(value).split(",");
  const cleaned = items.map((s) => s.trim()).filter((s) => s !== "");
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Accept a JSON value either parsed or as the JSON text a form field produces.
 * Anything unparseable passes through so the vendor, not this app, rejects it.
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

/** Build `?a=1&b=2`, skipping unset, null and empty values; arrays become comma lists. */
export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      params.set(key, value.join(","));
    } else {
      params.set(key, String(value));
    }
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** Dub's error envelope: `{ error: { code, message, doc_url } }`. */
export interface DubErrorBody {
  error?: { code?: string; message?: string; doc_url?: string };
}

/** One human line from a parsed error body, with the vendor error code when present. */
export function errorText(body: unknown, raw = ""): string {
  const e = (body as DubErrorBody | null)?.error;
  if (e && (e.message || e.code)) {
    return e.code ? `${e.message ?? ""} (${e.code})`.trim() : e.message!;
  }
  return raw.trim().slice(0, 200);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

/**
 * Thin client over `https://api.dub.co`. Credentials are never handled here:
 * the runtime routes every `ctx.fetch` through the Auth `sign` hook, which
 * stamps `Authorization: Bearer <key>`.
 */
export class DubClient {
  constructor(private readonly ctx: HookContext) {}

  async request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${API_URL}${path}${buildQuery(options.query)}`;
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
      } catch { /* non-JSON body: reported below if the request failed */ }
    }

    if (!res.ok) {
      throw new Error(
        `Dub ${method} ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}`,
      );
    }
    return (parsed ?? {}) as T;
  }
}

/** Drop `undefined` values so an unset form field is never sent. `null` is kept: it clears a field. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
