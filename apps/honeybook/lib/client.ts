import type { HookContext } from "@w6w/types";

/** `servers[0].url` of the OpenAPI document: `https://api.honeybook.com/api/v3`. */
export const API_BASE = "https://api.honeybook.com/api/v3";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/**
 * HoneyBook's one error shape, whatever went wrong (OpenAPI `info` section):
 * `{ error: true, is_timeout, error_type, error_message, error_data }`.
 */
interface HoneyBookErrorBody {
  error?: boolean;
  is_timeout?: boolean;
  error_type?: string;
  error_message?: string;
  error_data?: { fields?: Array<{ field?: string; message?: string }> };
}

export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** A body with no keys is not sent at all. */
export function nonEmpty(obj: Record<string, unknown>): Record<string, unknown> | undefined {
  return Object.keys(obj).length > 0 ? obj : undefined;
}

export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

export function asOptionalJson<T = unknown>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export function encodeId(id: string): string {
  const v = String(id ?? "").trim();
  if (!v) throw new Error("an id is required");
  return encodeURIComponent(v);
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Format a failure from the vendor's own `error_type`, never from the status
 * code alone: HoneyBook documents that a permission failure is a byte-identical
 * 404 (it will not confirm a record exists), and a missing OAuth scope is a 403.
 */
export function formatHoneyBookError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: HoneyBookErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as HoneyBookErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || typeof parsed !== "object" || !parsed.error_type) {
    return `HoneyBook ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const fields = (parsed.error_data?.fields ?? [])
    .map((f) => `${f.field ?? "?"} ${f.message ?? ""}`.trim())
    .join("; ");
  const hint = parsed.error_type === "HBInsufficientScopeError"
    ? "the connection was not granted a scope this endpoint requires; re-authorize with it"
    : status === 404
    ? "the record does not exist, or it exists and this account may not see it (the API does not distinguish)"
    : status === 401
    ? "the access token is missing, malformed or expired"
    : parsed.is_timeout
    ? "the request timed out server-side; safe to retry with backoff"
    : undefined;
  const parts = [
    `HoneyBook ${status} ${parsed.error_type} for ${method} ${path}`,
    parsed.error_message,
    fields ? `fields: ${fields}` : undefined,
    hint,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class HoneyBookClient {
  constructor(private ctx: HookContext) {}

  /** Returns the parsed JSON body, or `undefined` for a 204 / empty body. */
  async request<T = unknown>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T | undefined> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Array parameters are documented `style: form, explode: false`: ONE
      // comma-separated value, not a repeated key.
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatHoneyBookError(res.status, method, url.pathname, detail));
    }
    if (res.status === 204) return undefined;
    const text = await res.text();
    return text ? JSON.parse(text) as T : undefined;
  }
}
