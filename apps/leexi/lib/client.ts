import type { HookContext } from "@w6w/types";

/** `servers[0].url` from Leexi's OpenAPI documents. The version is part of the base. */
export const API_URL = "https://public-api.leexi.ai/v1";

/** Percent-encode one path segment (every id in this API is a caller-supplied uuid string). */
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

/**
 * Build `?a=1&b[]=x&b[]=y`. Leexi's list filters are Rails-style arrays — the docs
 * spell them `source_id[]=abc&source_id[]=xyz` — so an array is repeated with a
 * `[]` suffix, never comma-joined. Unset, null and empty values are skipped.
 */
export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        parts.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(item)}`);
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/** The pagination block every list route returns. */
export interface Pagination {
  page: number;
  items: number;
  count: number;
  pages: number;
}

/** Leexi's success envelope: `{ success, data, message }`; lists use `{ data, pagination }`. */
export interface LeexiEnvelope<T = unknown> {
  success?: boolean;
  data?: T;
  message?: string;
  pagination?: Pagination;
}

/**
 * One human line from a failed response. Leexi's edge answers 401 and 404 with an
 * EMPTY `text/html` body, so the status text is often all there is; JSON error
 * bodies (400/409/422) are read for `message` / `error` / `errors` when present.
 */
export function errorText(parsed: unknown, raw: string): string {
  if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    for (const k of ["message", "error", "errors"]) {
      const v = o[k];
      if (typeof v === "string" && v) return v;
      if (v && typeof v === "object") return JSON.stringify(v).slice(0, 300);
    }
  }
  const text = raw.trim();
  return text.startsWith("<") ? "" : text.slice(0, 200);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

/**
 * Thin client over `https://public-api.leexi.ai/v1`. Credentials are never handled
 * here: the runtime routes every `ctx.fetch` through the Auth `sign` hook, which
 * stamps `Authorization: Basic <base64(keyId:keySecret)>`.
 */
export class LeexiClient {
  constructor(private readonly ctx: HookContext) {}

  async request<T = LeexiEnvelope>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
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
      const detail = errorText(parsed, text);
      throw new Error(
        `Leexi ${method} ${path} failed: HTTP ${res.status}${detail ? ` — ${detail}` : ""}${
          hint(res.status)
        }`,
      );
    }
    return (parsed ?? {}) as T;
  }
}

/** What each documented status means in this API, appended to a failure. */
function hint(status: number): string {
  switch (status) {
    case 401:
      return " (API key ID/secret missing or invalid)";
    case 402:
      return " (the related Leexi subscription is inactive)";
    case 403:
      return " (the API key lacks the permission scope this endpoint needs)";
    case 429:
      return " (rate limited: 50 requests/minute, 10/minute for call creation)";
    default:
      return "";
  }
}

/** Drop `undefined` values so an unset form field is never sent. `null` is kept: it clears a field. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/** A nested object for a request body, or `undefined` when none of its fields is set. */
export function nested(obj: Record<string, unknown>): Record<string, unknown> | undefined {
  const out = compact(obj);
  return Object.keys(out).length > 0 ? out : undefined;
}
