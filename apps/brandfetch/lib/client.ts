import type { HookContext } from "@w6w/types";

/**
 * Brandfetch API. Verified 2026-10-06 against the vendor's OpenAPI document
 * (`docs.brandfetch.com/openapi.json`) plus live unauthenticated probes of
 * `api.brandfetch.io`.
 *
 * ## One host, one credential
 *
 * Every call goes to `https://api.brandfetch.io`. The key is a bearer token and
 * is added by the Auth `sign` hook; nothing here sees it.
 *
 * ## Errors are not what the status code says
 *
 * - A request with NO credential is `402 Payment required` (the vendor sells
 *   pay-per-request x402/MPP access), not 401. A malformed `Authorization`
 *   header is `401 {"message":"Unauthorized"}` and an unknown or revoked key is
 *   `403 {"message":"Forbidden"}`.
 * - `404` is billed: "Every 404 consumes an API credit". With the header
 *   `x-bf-error: crawl_queued` it means the brand was not held yet and is now
 *   being collected, so a retry a minute or two later is usually served. That is
 *   returned as a result (`crawlQueued: true`), not thrown.
 * - `204` (only with `cachedOnly=true`) means "not indexed yet"; it is not billed.
 */
export const API_HOST = "api.brandfetch.io";
export const API_BASE = `https://${API_HOST}`;

type Scalar = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, Scalar>;
  body?: unknown;
  headers?: Record<string, string>;
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} chars truncated)`;
}

export function encodeSegment(value: string): string {
  return encodeURIComponent(String(value ?? "").trim());
}

/** The vendor's `message` out of a JSON error body, else the raw text. */
export function errorText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof parsed?.message === "string") return parsed.message;
    if (typeof parsed?.error === "string") return parsed.error;
  } catch { /* plain text */ }
  return trimmed;
}

export function formatError(status: number, method: string, path: string, raw: string): string {
  const text = errorText(raw);
  const hint = status === 402
    ? " — no usable API key reached the request; reconnect this connection"
    : status === 401 || status === 403
    ? " — the API key was rejected; check it was copied exactly and has not been revoked"
    : status === 404
    ? " — the brand was not found (a 404 still consumes an API credit)"
    : status === 429
    ? " — the API key's quota or rate limit is exhausted"
    : status === 400
    ? " — the identifier is malformed (the vendor does not bill a 400)"
    : "";
  return truncate(`Brandfetch ${status} for ${method} ${path}: ${text}${hint}`, 1000);
}

export interface ApiResult {
  status: number;
  /** Parsed JSON, or the raw text for non-JSON bodies. `undefined` when the body is empty. */
  body: unknown;
  /** `x-bf-error` response header, when present. */
  bfError?: string;
}

export class BrandfetchClient {
  constructor(private ctx: HookContext) {}

  /**
   * Returns the response for 2xx, `204`, and a `crawl_queued` 404. Every other
   * non-2xx throws with the vendor's own message.
   */
  async request(path: string, options: RequestOptions = {}): Promise<ApiResult> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const method = options.method ?? (options.body !== undefined ? "POST" : "GET");
    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    // No credential here: the Auth `sign` hook adds the bearer header.
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    const bfError = res.headers.get("x-bf-error") ?? undefined;

    if (res.status === 404 && bfError === "crawl_queued") {
      return { status: 404, body: undefined, bfError };
    }
    if (!res.ok) throw new Error(formatError(res.status, method, url.pathname, text));
    if (!text) return { status: res.status, body: undefined, bfError };
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch { /* markdown / text */ }
    return { status: res.status, body, bfError };
  }
}

/** Drop `undefined`/`null`/empty-string members. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}
