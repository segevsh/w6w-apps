import type { HookContext } from "@w6w/types";

/**
 * Thin client over the MaintainX REST API v1 (`https://api.getmaintainx.com/v1`,
 * OpenAPI document fetched 2026-10-06 from `/v1/openapi.json`).
 *
 * The credential is never handled here: every request goes through `ctx.fetch`
 * and the Auth `sign` hook stamps `Authorization: Bearer <key>` on it.
 */

export const API_BASE = "https://api.getmaintainx.com";

export const API_PREFIX = "/v1";

export type QueryValue = string | number | boolean | undefined | null | Array<string | number>;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** `x-organization-id` — only meaningful for a multi-organization API key. */
  organizationId?: number | string;
}

/** Drop undefined / null / empty-string so an unset form field is never sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** `"1, 2,3"` or `[1,2]` -> `["1","2","3"]`; empty -> undefined. */
export function toList(
  v: string | Array<string | number> | undefined | null,
): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Comma-separated ids -> numbers; throws on a non-numeric entry instead of sending NaN. */
export function toIdList(v: string | Array<string | number> | undefined | null, label: string) {
  const items = toList(v);
  if (!items) return undefined;
  return items.map((s) => {
    const n = Number(s);
    if (!Number.isInteger(n)) throw new Error(`${label}: "${s}" is not a numeric id`);
    return n;
  });
}

export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * MaintainX errors are `{"error": "<message>"}`. A 401 without any credential
 * is instead a plain-text/HTML body ("Invalid authentication token"), so the
 * raw text is the fallback.
 */
export function formatMaintainXError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let message = raw;
  try {
    const parsed = JSON.parse(raw) as { error?: unknown };
    if (parsed && typeof parsed.error === "string") message = parsed.error;
    else if (parsed && parsed.error !== undefined) message = JSON.stringify(parsed.error);
  } catch { /* not JSON — keep the raw body */ }
  const hint = status === 429
    ? " (rate limited; meter readings are limited to 10 manual-meter requests per 24h on the " +
      "single-reading endpoint, so batch them)"
    : "";
  return truncate(`MaintainX ${status} for ${method} ${path}: ${message}${hint}`, 1000);
}

export class MaintainXClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // MaintainX array filters are REPEATED keys (`statuses=OPEN&statuses=DONE`),
      // not one comma-separated value.
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, String(item)); }
      else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    if (options.organizationId !== undefined && options.organizationId !== "") {
      headers["x-organization-id"] = String(options.organizationId);
    }
    const method = options.method ?? "GET";
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatMaintainXError(res.status, method, url.pathname, detail));
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /** A list endpoint: `{ <key>: [...], nextCursor, nextPageUrl }` -> `{ <key>, nextCursor }`. */
  async list(
    path: string,
    key: string,
    query: Record<string, QueryValue>,
    organizationId?: number | string,
  ): Promise<Record<string, unknown>> {
    const body = await this.request<Record<string, unknown>>(path, { query, organizationId });
    return { [key]: body?.[key] ?? [], nextCursor: body?.nextCursor ?? null };
  }

  /** A single-entity endpoint: `{ <key>: {...} }` -> the entity. */
  async entity<T = unknown>(path: string, key: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.request<Record<string, unknown>>(path, options);
    return (body && key in body ? body[key] : body) as T;
  }
}
