import type { HookContext } from "@w6w/types";

/**
 * Gumroad API v2 REST client.
 *
 * Everything here was read from Gumroad's own API reference (`gumroad.com/api`,
 * client-rendered, captured with a headless browser on 2026-10-05). It was not
 * exercised against a live account — no credential was available — so every
 * claim below is "documented", not "measured".
 *
 * ## One host, one prefix
 *
 * Every endpoint is `https://api.gumroad.com/v2/...`. The only other host in
 * the reference is the per-seller public product page (`<seller>.gumroad.com/l/
 * <permalink>.json`), which needs no credential and is not wrapped.
 *
 * ## Responses: a `success` flag, not the status code, is the contract
 *
 * Every body, including every error, is JSON with a boolean `success`. A
 * failure is `{"success": false, "message": "…"}`. The reference lists 400, 401,
 * 402 (valid parameters, request still failed), 404 and 5xx, and does not
 * promise that a `success: false` body always comes with a non-2xx status — so
 * {@link GumroadClient.call} treats EITHER as a failure, and surfaces the
 * vendor's `message` rather than a bare status.
 *
 * ## Request bodies are form-encoded
 *
 * Every documented write example is `curl -d "name=value"`, i.e.
 * `application/x-www-form-urlencoded`, and booleans are the strings
 * `"true"`/`"false"`. Arrays use Rails' `key[]=` convention. This client sends
 * exactly that, rather than JSON, because a JSON `false` is not the string
 * `"false"` the reference documents for `increment_uses_count` and friends.
 *
 * ## Ids contain `=`
 *
 * Gumroad ids are base64-ish (`A-m3CDDC5dlrSdKZp0RFhA==`). {@link seg}
 * percent-encodes them as one path segment; the server decodes it.
 */

/** The one API origin. */
export const API_BASE = "https://api.gumroad.com";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/v2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  /** Sent form-encoded. `undefined`, `null` and `""` are dropped; `false` and `0` are kept. */
  form?: Record<string, unknown>;
}

/** A Gumroad response body: `success` plus whatever the endpoint adds. */
export interface GumroadBody {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

/** Percent-encode one caller-supplied id as a single path segment. */
export function seg(id: unknown): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Drop keys the caller left unset. `false` and `0` survive — they are meaningful. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Split a comma-separated string (or pass an array through) into a trimmed list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(",")).map((s) => String(s).trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Render a form payload the way the reference's `curl -d` examples do. */
export function encodeForm(form: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(compact(form))) {
    if (Array.isArray(v)) { for (const item of v) params.append(`${k}[]`, String(item)); }
    else params.append(k, String(v));
  }
  return params.toString();
}

/** Keep an error message readable. */
export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** One actionable line from a failed call. The vendor's `message` is kept verbatim. */
export function formatGumroadError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let message: string | undefined;
  try {
    const parsed = JSON.parse(raw) as GumroadBody;
    if (typeof parsed?.message === "string") message = parsed.message;
  } catch { /* not JSON — fall through to the raw body */ }
  if (message === undefined) return `Gumroad ${status} for ${method} ${path}: ${truncate(raw)}`;
  const hint = status === 401
    ? " (the access token was rejected or lacks the scope this endpoint needs)"
    : "";
  return truncate(`Gumroad ${status} for ${method} ${path}: ${message}${hint}`, 1000);
}

export class GumroadClient {
  constructor(private ctx: HookContext) {}

  /**
   * Call one endpoint and return the parsed body. Throws on a non-2xx status
   * OR on `success: false`.
   */
  async call(method: string, path: string, options: RequestOptions = {}): Promise<GumroadBody> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.form !== undefined) {
      headers["content-type"] = "application/x-www-form-urlencoded";
      init.body = encodeForm(options.form);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(formatGumroadError(res.status, method, url.pathname, text));

    let body: GumroadBody;
    try {
      body = JSON.parse(text) as GumroadBody;
    } catch {
      throw new Error(
        `Gumroad ${res.status} for ${method} ${url.pathname}: expected JSON, got ${
          truncate(text, 200)
        }`,
      );
    }
    if (body?.success === false) {
      throw new Error(formatGumroadError(res.status, method, url.pathname, text));
    }
    return body;
  }
}
