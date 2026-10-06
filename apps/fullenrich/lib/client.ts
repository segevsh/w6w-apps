import type { HookContext } from "@w6w/types";

/** `servers[0].url` from FullEnrich's v2 OpenAPI document (the v1 surface is the older one). */
export const API_URL = "https://app.fullenrich.com/api/v2";

/** Percent-encode one path segment. */
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

/** Drop `undefined` values so an unset form field is never sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export type Query = Record<string, string | number | boolean | undefined | null>;

/** Build `?a=1&b=2`, skipping unset, null and empty values. */
export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** FullEnrich's error envelope: `{ code, message }` — `code` is a dotted `error.…` string. */
export interface FullEnrichErrorBody {
  code?: string;
  message?: string;
}

/** One human line from a parsed error body, with the vendor error code when present. */
export function errorText(body: unknown, raw = ""): string {
  const e = body as FullEnrichErrorBody | null;
  if (e && (e.message || e.code)) {
    return e.code ? `${e.message ?? ""} (${e.code})`.trim() : e.message!;
  }
  return raw.trim().slice(0, 200);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
  /**
   * Statuses whose body is a normal result, not an error. The reverse-email GET
   * documents HTTP 402 carrying a full result document (status
   * `CREDITS_INSUFFICIENT`), so a caller polling it must still see that status.
   */
  okStatuses?: number[];
}

/**
 * Thin client over `https://app.fullenrich.com/api/v2`. Credentials are never
 * handled here: the runtime routes every `ctx.fetch` through the Auth `sign`
 * hook, which stamps `Authorization: Bearer <key>`.
 */
export class FullEnrichClient {
  constructor(private readonly ctx: HookContext) {}

  async request<T = unknown>(
    method: "GET" | "POST",
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

    if (!res.ok && !options.okStatuses?.includes(res.status)) {
      throw new Error(
        `FullEnrich ${method} ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}`,
      );
    }
    return (parsed ?? {}) as T;
  }
}
