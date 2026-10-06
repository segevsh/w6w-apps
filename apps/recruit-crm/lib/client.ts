/**
 * Recruit CRM API client — `https://api.recruitcrm.io/v1`.
 *
 * Read off the vendor's OpenAPI document (`https://api.recruitcrm.io/docs`, 3.0.0), and the
 * unsigned error shapes were probed live on 2026-10-06:
 *
 *  1. **Auth is `Authorization: Bearer <token>`**, stamped by `sign` only (auth/api-token.ts).
 *  2. **Lists are Laravel paginators**: `{current_page, data[], per_page, next_page_url, …}`.
 *     `page` and `limit` (max 100) are the query parameters; `next_page_url` is null on the
 *     last page. `pageOf` folds that into `{items, count, currentPage, perPage, hasMore}`.
 *  3. **Edits are `POST /{entity}/{id}`**, not PUT/PATCH; only DELETE removes a record.
 *  4. **Candidate create/edit are `multipart/form-data`** (the spec's declared media type);
 *     every other entity takes JSON. `multipartBody` builds that body by hand because the
 *     hook sandbox is handed a string, not a `FormData`.
 *  5. **Error bodies vary**: `{error: "Unauthorized"}` with no credential, but
 *     `{message: "credential could not be resolved"}` for a bad token, and `{error, errorCode,
 *     errorMessage}` for a 404. `errorText` reads all three.
 *  6. **Path "slugs" are numeric ids** (the spec types every `{candidate}`, `{job}`, … as an
 *     integer and calls it a slug), so they are passed through as strings and URL-encoded.
 */
import type { HookContext } from "@w6w/types";

export const API_BASE = "https://api.recruitcrm.io";
export const API_PREFIX = "/v1";
/** Documented maximum for `limit`. */
export const MAX_LIMIT = 100;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** JSON body. */
  body?: Record<string, unknown>;
  /** Sent as multipart/form-data instead of JSON. */
  form?: Record<string, unknown>;
}

interface ErrorBody {
  error?: unknown;
  errorCode?: unknown;
  errorMessage?: unknown;
  message?: unknown;
}

/** Drop unset values so a half-filled form never sends `email=` or `city=`. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export function encodeId(id: unknown): string {
  const s = String(id ?? "").trim();
  if (!s) throw new Error("an id (slug) is required");
  return encodeURIComponent(s);
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** The vendor's own error text from any of the three observed shapes, else undefined. */
export function errorText(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const p = payload as ErrorBody;
  for (const v of [p.errorMessage, p.message, p.error]) {
    if (typeof v === "string" && v) return v;
  }
  return undefined;
}

export function formatRecruitError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch { /* not JSON — fall through to the raw body */ }
  const text = errorText(parsed);
  if (!text) return `Recruit CRM ${status} for ${method} ${path}: ${truncate(raw)}`;
  const code = (parsed as ErrorBody).errorCode;
  return truncate(
    `Recruit CRM ${status}${
      typeof code === "string" ? ` ${code}` : ""
    } for ${method} ${path}: ${text}`,
    1000,
  );
}

/** Records from a vendor list: a bare array, a paginator's `data`, or a lone object. */
export function recordsOf(raw: unknown): unknown[] {
  if (raw === undefined || raw === null) return [];
  if (Array.isArray(raw)) return raw;
  const data = (raw as { data?: unknown }).data;
  return Array.isArray(data) ? data : [raw];
}

export interface Page<T> {
  items: T[];
  count: number;
  currentPage: number | null;
  perPage: number | null;
  /** True when the vendor's `next_page_url` is non-null. */
  hasMore: boolean;
}

interface Paginator<T> {
  data?: T[];
  current_page?: number;
  per_page?: number;
  next_page_url?: string | null;
}

/** Fold Recruit CRM's Laravel paginator into a stable, documented page shape. */
export function pageOf<T>(raw: Paginator<T> | null | undefined): Page<T> {
  const items = Array.isArray(raw?.data) ? raw!.data! : [];
  return {
    items,
    count: items.length,
    currentPage: typeof raw?.current_page === "number" ? raw.current_page : null,
    perPage: typeof raw?.per_page === "number" ? raw.per_page : null,
    hasMore: typeof raw?.next_page_url === "string" && raw.next_page_url.length > 0,
  };
}

/** Hand-built multipart body. Returns the body and the full content-type header value. */
export function multipartBody(fields: Record<string, unknown>): { body: string; type: string } {
  const boundary = `----w6w${crypto.randomUUID().replaceAll("-", "")}`;
  let body = "";
  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${
      String(value)
    }\r\n`;
  }
  body += `--${boundary}--\r\n`;
  return { body, type: `multipart/form-data; boundary=${boundary}` };
}

export class RecruitClient {
  constructor(private ctx: HookContext) {}

  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const method = options.method ?? "GET";
    const init: RequestInit = { method, headers };
    if (options.form !== undefined) {
      const { body, type } = multipartBody(options.form);
      headers["content-type"] = type;
      init.body = body;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatRecruitError(res.status, method, url.pathname, detail));
    }
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Recruit CRM answered ${res.status} for ${method} ${url.pathname} with a non-JSON body: ${
          truncate(text, 200)
        }`,
      );
    }
  }
}
