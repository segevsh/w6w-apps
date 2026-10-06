import type { HookContext } from "@w6w/types";

/**
 * WakaTime API v1 client.
 *
 * Verified on 2026-10-06 against `wakatime.com/developers` ("All API resources have the url
 * prefix https://api.wakatime.com/api/v1/") and live unauthenticated probes of `api.wakatime.com`.
 *
 * ## One host, one credential
 *
 * Every call goes to `https://api.wakatime.com/api/v1`. The secret API key is stamped on by the
 * Auth `sign` hook (HTTP Basic). Reads wrap the payload in `{ "data": ... }`; the Auth-free
 * lists (`/editors`, `/meta`) do too. Commits answer `{ commits, next_page, ... }` instead.
 *
 * ## Things that are not what they look like
 *
 * - `https://wakatime.com/api/v1` is the website host and is what the reference's own Python
 *   sample uses; the documented prefix, and the only host this app declares, is
 *   `api.wakatime.com`.
 * - A missing, malformed or wrong key all answer HTTP 401 with the byte-identical body
 *   `{"errors": ["Unauthorized."]}`. There is no machine-readable error code to tell them apart.
 * - Rate limit: "fewer than 10 requests per second on average over any 5 minute period"; a
 *   breach is sometimes a **302** that times out instead of a 429 (documented).
 * - Stats, summaries and insights answer **202** while a range is still being computed; the body
 *   then carries `is_up_to_date: false` and should be read again later.
 */
export const API_HOST = "api.wakatime.com";
export const API_BASE = `https://${API_HOST}/api/v1`;

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

/**
 * Accept a JSON value either parsed or as the JSON text a form field produces. Anything
 * unparseable passes through so WakaTime, not this app, rejects it.
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

/** Drop `undefined` values so an unset form field is never sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/** One human line from a parsed error body (`{errors: [...]}` or `{error: "..."}`). */
export function errorText(body: unknown, raw = ""): string {
  if (body && typeof body === "object") {
    const b = body as { errors?: unknown; error?: unknown; message?: unknown };
    if (Array.isArray(b.errors) && b.errors.length > 0) return b.errors.map(String).join("; ");
    if (b.errors && typeof b.errors === "object") return JSON.stringify(b.errors).slice(0, 200);
    if (typeof b.error === "string") return b.error;
    if (typeof b.message === "string") return b.message;
  }
  return raw.trim().slice(0, 200);
}

/** True when a parsed body is WakaTime's `{ "errors": [...] }` envelope. */
export function isErrorEnvelope(body: unknown): boolean {
  return !!body && typeof body === "object" &&
    Array.isArray((body as { errors?: unknown }).errors);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

export class WakaClient {
  constructor(private readonly ctx: HookContext) {}

  /** Issue a request; returns the parsed JSON body (`{}` when empty). */
  async request<T = Record<string, unknown>>(
    method: "GET" | "POST" | "PUT" | "DELETE",
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
        `WakaTime ${method} ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}`,
      );
    }
    return (parsed ?? {}) as T;
  }
}

/** Every per-user route lives under `/users/current`. */
export const USER = "/users/current";
