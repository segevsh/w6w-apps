import type { HookContext } from "@w6w/types";

/**
 * Printful API (v1, the stable reference at developers.printful.com/docs) client.
 *
 * Verified 2026-10-06 against the OpenAPI 3.0 document embedded in that page
 * (`servers: https://api.printful.com`) and live unauthenticated probes.
 *
 * ## One host, one envelope
 *
 * Every call goes to `https://api.printful.com`. Success is `{ "code": 200, "result": …,
 * "paging"?: { total, offset, limit } }`; the payload is always under `result`. Failure keeps
 * the same shape with a string `result` and an `error` object:
 * `{ "code": 401, "result": "<message>", "error": { "reason": "Unauthorized", "message": "…" } }`.
 *
 * ## Things that are not what they look like
 *
 * - `GET /products`, `/categories` and the other catalog reads answer 200 with no credential at
 *   all, so a 200 there proves nothing about a token; `GET /stores` is the real probe.
 * - A path `{id}` for orders and sync products is the numeric id, or `@<external_id>`.
 * - Rate limit: 120 calls/minute, reported in `X-RateLimit-*` headers on every response.
 */
export const API_HOST = "api.printful.com";
export const API_BASE = `https://${API_HOST}`;

/** Percent-encode one path segment. */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

/** Accept a JSON value either parsed or as the JSON text a form field produces. */
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

/** A list as a real array or as the comma-separated text a form field produces. */
export function typeList(value: unknown): string[] | undefined {
  const v = jsonValue(value);
  if (v === undefined || v === null) return undefined;
  const items = Array.isArray(v) ? v.map(String) : String(v).split(",");
  const cleaned = items.map((s) => s.trim()).filter((s) => s !== "");
  return cleaned.length > 0 ? cleaned : undefined;
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

export interface Paging {
  total: number;
  offset: number;
  limit: number;
}

export interface PrintfulError {
  reason?: string;
  message?: string;
}

/** The vendor's `error` object out of a parsed body, when it is one. */
export function vendorError(body: unknown): PrintfulError | undefined {
  if (body && typeof body === "object") {
    const err = (body as { error?: unknown }).error;
    if (err && typeof err === "object") return err as PrintfulError;
  }
  return undefined;
}

/** One human line from a parsed error body: `reason: message`. */
export function errorText(body: unknown, raw = ""): string {
  const e = vendorError(body);
  if (e && (e.reason || e.message)) return [e.reason, e.message].filter(Boolean).join(": ");
  const result = (body as { result?: unknown } | undefined)?.result;
  if (typeof result === "string" && result !== "") return result;
  return raw.trim().slice(0, 200);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

export interface Reply<T> {
  result: T;
  paging?: Paging;
  headers: Headers;
}

export class PrintfulClient {
  constructor(private readonly ctx: HookContext) {}

  /** Issue a request and unwrap the `{code, result, paging}` envelope. */
  async send<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<Reply<T>> {
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
      const reset = res.headers.get("x-ratelimit-reset");
      throw new Error(
        `Printful ${method} ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}${
          res.status === 429 && reset ? ` (rate limit resets in ${reset}s)` : ""
        }`,
      );
    }
    const env = (parsed ?? {}) as { result?: T; paging?: Paging };
    return { result: env.result as T, paging: env.paging, headers: res.headers };
  }

  /** The unwrapped `result`. */
  async request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    return (await this.send<T>(method, path, options)).result;
  }

  /** A list call: `{ items, paging }`. */
  async list<T = Record<string, unknown>>(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ items: T[]; paging?: Paging }> {
    const { result, paging } = await this.send<T[]>("GET", path, options);
    return { items: Array.isArray(result) ? result : [], ...(paging ? { paging } : {}) };
  }
}
