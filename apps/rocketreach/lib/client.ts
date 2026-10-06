import type { HookContext } from "@w6w/types";

/**
 * RocketReach API v2. Verified 2026-10-06 against the vendor's OpenAPI documents
 * (docs.rocketreach.co/reference, v2.1.1; every page's `servers` is
 * `https://api.rocketreach.co/api/v2`) plus live, credential-free probes.
 *
 * ## One host, one header
 *
 * Every call goes to `https://api.rocketreach.co/api/v2`. The key is the `Api-Key`
 * request header and is added by the Auth `sign` hook; nothing here sees it. The
 * older `api_key` query parameter is documented as deprecated and never used.
 *
 * ## Errors
 *
 * Auth failures are `401 {"detail": "...", "error_code": "authentication_failed"}`:
 * a missing key says `Anonymous requests are not allowed. Please use the test API
 * key.`, a wrong one `Invalid API key`. Running out of lookup credits is a `403`
 * with a prose `detail`; running out of email-verification credits is a `402`
 * with `credit_type` and `purchase_url`. `429` carries `Retry-After` (seconds).
 */
export const API_HOST = "api.rocketreach.co";
export const API_BASE = `https://${API_HOST}/api/v2`;

type Scalar = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** An array value is sent as repeated parameters (`ids=1&ids=2`). */
  query?: Record<string, unknown>;
  body?: unknown;
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} chars truncated)`;
}

/** The vendor's `detail`, `message` or `error` out of a JSON error body, else the raw text. */
export function errorText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    for (const key of ["detail", "message", "error"]) {
      if (typeof parsed?.[key] === "string") return parsed[key] as string;
    }
  } catch { /* plain text */ }
  return trimmed;
}

/** The vendor's `error_code` out of a JSON error body (a string or a number), if any. */
export function errorCode(raw: string): string | undefined {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const code = parsed?.error_code;
    return typeof code === "string" || typeof code === "number" ? String(code) : undefined;
  } catch {
    return undefined;
  }
}

export function formatError(
  status: number,
  method: string,
  path: string,
  raw: string,
  retryAfter?: string | null,
): string {
  const text = errorText(raw);
  let extra = "";
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed?.credit_type === "string") extra = ` [credit_type ${parsed.credit_type}]`;
  } catch { /* not JSON */ }
  const hint = status === 401
    ? " — the API key was missing or rejected; reconnect with a key from rocketreach.co/account"
    : status === 402
    ? " — out of email verification credits"
    : status === 403
    ? " — the key lacks permission, or the lookup credits are exhausted"
    : status === 404
    ? " — nothing matched"
    : status === 429
    ? ` — rate limited${retryAfter ? `; retry after ${retryAfter}s` : ""}`
    : status === 400
    ? " — the request is malformed or missing a required parameter"
    : "";
  return truncate(`RocketReach ${status} for ${method} ${path}: ${text}${extra}${hint}`, 1000);
}

export interface ApiResult {
  status: number;
  /** Parsed JSON, or the raw text for a non-JSON body. `undefined` when the body is empty. */
  body: unknown;
  headers: Headers;
}

export class RocketReachClient {
  constructor(private ctx: HookContext) {}

  /** Returns the response for any 2xx. Every other status throws with the vendor's message. */
  async request(path: string, options: RequestOptions = {}): Promise<ApiResult> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      for (const item of (Array.isArray(v) ? v : [v]) as Scalar[]) {
        if (item === undefined || item === null || item === "") continue;
        url.searchParams.append(k, String(item));
      }
    }
    const method = options.method ?? (options.body !== undefined ? "POST" : "GET");
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    // No credential here: the Auth `sign` hook adds the Api-Key header.
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        formatError(res.status, method, url.pathname, text, res.headers.get("retry-after")),
      );
    }
    if (!text) return { status: res.status, body: undefined, headers: res.headers };
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch { /* keep the text */ }
    return { status: res.status, body, headers: res.headers };
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

/** A `json` param arrives as an object, or as text when typed by hand. */
export function parseJsonParam(value: unknown, label: string): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
}

/** Comma- or newline-separated text (or an array) → trimmed, non-empty strings. */
export function toList(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value.map(String)
    : typeof value === "string"
    ? value.split(/[\n,]/)
    : value === undefined || value === null
    ? []
    : [String(value)];
  return raw.map((s) => s.trim()).filter((s) => s !== "");
}
