import type { HookContext } from "@w6w/types";

/**
 * Zeplin REST API — verified 2026-10-06 against the vendor's API reference
 * (`https://docs.zeplin.dev/llms.txt`, per-operation OpenAPI 3.0.2 fragments, server
 * `https://api.zeplin.dev`) and live probes of `api.zeplin.dev`.
 *
 * - Base `https://api.zeplin.dev/v1`. Auth is `Authorization: Bearer <token>` — a personal access
 *   token or an OAuth access token — added by the Auth `sign` hook, never here.
 * - List endpoints answer a bare JSON ARRAY and paginate with `limit` (1-100, default 30) and
 *   `offset`; there is no total or cursor, so a page shorter than `limit` is the last.
 * - Writes: `POST` create answers 201 `{ id }`; `PATCH`/`DELETE` answer 204 with no body.
 * - Errors are JSON `{ message, detail? }` (e.g. `{"message":"invalid_token"}`); a 429 carries
 *   "Rate limit exceeded" (200 requests per minute per user) and `Zeplin-RateLimit-*` headers.
 * - Timestamps are UNIX seconds.
 */
export const API_HOST = "api.zeplin.dev";
export const API_ORIGIN = `https://${API_HOST}`;
export const API_BASE = `${API_ORIGIN}/v1`;

export type Scalar = string | number | boolean | undefined | null;

export interface ZeplinError {
  message?: string;
  detail?: string;
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} chars truncated)`;
}

/** Drop `undefined`/`null`/empty-string members so the wire carries only what was set. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

/** A required path/body value: trimmed, non-empty. */
export function requireText(value: unknown, label: string): string {
  const s = String(value ?? "").trim();
  if (!s) throw new Error(`${label} is required`);
  return s;
}

/** A required id, URL-encoded for use inside a path segment. */
export function pathId(value: unknown, label: string): string {
  return encodeURIComponent(requireText(value, label));
}

/** Accepts an array or a comma/newline-separated string; returns trimmed non-empty items. */
export function toList(v: string[] | string | undefined): string[] {
  const items = Array.isArray(v) ? v : String(v ?? "").split(/[\n,]/);
  return items.map((s) => String(s).trim()).filter(Boolean);
}

export function errorText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const e = JSON.parse(trimmed) as ZeplinError;
    if (e && typeof e === "object" && typeof e.message === "string") {
      return e.detail ? `${e.message} (${e.detail})` : e.message;
    }
  } catch { /* not JSON */ }
  if (/^\s*<(!doctype|html)/i.test(trimmed)) {
    return /<title>([^<]*)<\/title>/i.exec(trimmed)?.[1]?.trim() ?? "HTML error page";
  }
  return trimmed;
}

export function formatError(
  status: number,
  method: string,
  path: string,
  raw: string,
  retryAfter?: string | null,
): string {
  const hint = status === 401
    ? " — the access token was rejected; reconnect this connection"
    : status === 403
    ? " — the token lacks permission for this resource"
    : status === 404
    ? " — not found, or the token's user is not a member of the project/styleguide"
    : status === 422
    ? " — the project is archived or the user is not a member of it"
    : status === 429
    ? ` — rate limit reached (200 requests/minute/user)${
      retryAfter ? `; retry after ${retryAfter}s` : ""
    }`
    : "";
  return truncate(`Zeplin ${status} for ${method} ${path}: ${errorText(raw)}${hint}`, 1000);
}

export type Query = Record<string, Scalar>;

export interface Page<T = unknown> {
  items: T[];
  count: number;
  limit: number;
  offset: number;
  /** `offset` for the next call, or null when this page was short (the last one). */
  next_offset: number | null;
}

export class ZeplinClient {
  constructor(private ctx: HookContext) {}

  /** Send a request; returns the parsed JSON body, or `null` for an empty (204) body. */
  async request<T = unknown>(
    method: string,
    path: string,
    opts: { query?: Query; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    // No credential here: the Auth `sign` hook adds the Authorization header.
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatError(res.status, method, path, text, res.headers.get("retry-after")));
    }
    if (!text.trim()) return null as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Zeplin ${method} ${path}: expected JSON, got ${truncate(text, 200)}`);
    }
  }

  get<T = unknown>(path: string, query?: Query): Promise<T> {
    return this.request<T>("GET", path, { query });
  }

  /** GET a list endpoint and wrap the bare array with its pagination position. */
  async page(
    path: string,
    query: Query,
    paging: { limit?: number; offset?: number },
  ): Promise<Page> {
    const limit = paging.limit ?? 30;
    const offset = paging.offset ?? 0;
    const items = await this.get<unknown>(path, { ...query, limit, offset });
    if (!Array.isArray(items)) {
      throw new Error(`Zeplin GET ${path}: expected a JSON array, got ${typeof items}`);
    }
    return {
      items,
      count: items.length,
      limit,
      offset,
      next_offset: items.length >= limit ? offset + items.length : null,
    };
  }
}
