import type { HookContext } from "@w6w/types";

/**
 * Leadfeeder (Dealfront) public API client.
 *
 * Verified 2026-10-06 against the vendor's OpenAPI document `https://api.leadfeeder.com/openapi.yaml`
 * (linked from `docs.leadfeeder.com/api/public`; `servers: https://api.leadfeeder.com`) and live
 * unauthenticated probes of `api.leadfeeder.com`.
 *
 * ## Two APIs, one host
 *
 * The documented-at-the-old-URL API (`docs.leadfeeder.com/api/`, `Authorization: Token
 * token=…`, `/accounts/{id}/leads`) is the **legacy** API: its own page says "New API tokens are
 * not issued for the legacy API" and "maintaining existing integrations only". This app targets
 * the current `/v1/*` API, authenticated by the `X-Api-Key` header.
 *
 * ## Shape
 *
 * - Almost every route needs `account_id` as a query parameter (list ids with `GET /v1/accounts`).
 * - Success bodies are JSON:API-ish `{ data, meta }`; `meta.pagination` is either page-based
 *   (`page[num]`/`page[size]`, `page_count`) or cursor-based (`page[cursor]`, `next_cursor`).
 * - Failures are `{ "errors": [{ "code", "title", "detail"? }], "meta": { "request_id" } }`; the
 *   401 family also carries a duplicate singular `error: { code, message }`. `code` is the
 *   stable part.
 */
export const API_HOST = "api.leadfeeder.com";
export const API_BASE = `https://${API_HOST}`;

/** Auth failures the vendor names (the OpenAPI 401 examples). */
export const AUTH_ERROR_CODES = new Set([
  "api_key_expired",
  "invalid_api_key",
  "invalid_token",
  "missing_token",
  "token_expired",
  "token_revoked",
  "oauth_app_inactive",
  "oauth_app_not_found",
]);

/** Percent-encode one path segment. */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

/** Accept a list as a real array or as the comma-separated text a form field produces. */
export function strList(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  const items = Array.isArray(value) ? value.map(String) : String(value).split(",");
  const cleaned = items.map((s) => s.trim()).filter((s) => s !== "");
  return cleaned.length > 0 ? cleaned : undefined;
}

/** Accept JSON either parsed or as the text a form field produces; garbage passes through. */
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

export type Query = Record<string, string | number | boolean | undefined | null>;

/** Build `?a=1&b=2`, skipping unset, null and empty values. Keys like `page[size]` are encoded. */
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

/** Drop `undefined` values so an unset form field is never sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export interface LeadfeederError {
  code?: string;
  title?: string;
  detail?: string;
}

/** The first vendor error out of a parsed body, tolerating the singular `error` form. */
export function vendorError(body: unknown): LeadfeederError | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as {
    errors?: unknown;
    error?: { code?: string; message?: string };
  };
  if (Array.isArray(b.errors) && b.errors[0] && typeof b.errors[0] === "object") {
    return b.errors[0] as LeadfeederError;
  }
  if (b.error && typeof b.error === "object") {
    return { code: b.error.code, title: b.error.message };
  }
  return undefined;
}

/** One human line from a parsed error body: `code: title (detail)`. */
export function errorText(body: unknown, raw = ""): string {
  const e = vendorError(body);
  if (e && (e.code || e.title)) {
    const head = [e.code, e.title].filter(Boolean).join(": ");
    return e.detail ? `${head} (${e.detail})` : head;
  }
  return raw.trim().slice(0, 200);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

export interface Envelope {
  data?: unknown;
  meta?: Record<string, unknown> & {
    pagination?: { next_cursor?: string | null; page_num?: number; page_count?: number };
  };
}

export class LeadfeederClient {
  constructor(private readonly ctx: HookContext) {}

  /** Issue a request; returns the parsed `{ data, meta }` body (`{}` for an empty body). */
  async request<T = Envelope>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${API_BASE}${path}${buildQuery(options.query)}`;
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
        `Leadfeeder ${method} ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}`,
      );
    }
    return (parsed ?? {}) as T;
  }
}

/** Shape every action returns: the envelope plus a ready-made pager hint. */
export function reply(env: Envelope): Record<string, unknown> {
  const p = env.meta?.pagination;
  const out: Record<string, unknown> = { data: env.data ?? null, meta: env.meta ?? {} };
  if (p?.next_cursor) out.nextCursor = p.next_cursor;
  if (p?.page_num !== undefined && p.page_count !== undefined && p.page_num < p.page_count) {
    out.nextPage = p.page_num + 1;
  }
  return out;
}
