import type { HookContext } from "@w6w/types";

/**
 * Perspective External API client.
 *
 * Verified on 2026-10-06 against developers.perspective.co (the Docusaurus
 * reference, source in github.com/Perspective-Software/developer-docs) plus
 * unsigned and bogus-key probes of the live host.
 *
 * ## One host, one prefix
 *
 * The documented base URL is `https://api.perspective.co/v1`. The host
 * `perspective-api.co` also answers (same 401 body) but appears nowhere in the
 * reference, so it is neither used nor allow-listed.
 *
 * ## Envelope
 *
 * Success is `{"data": …}`; list endpoints add `{"meta": {total, page, limit,
 * hasNext}}`. Pages are **0-based** and `limit` is 1–100 (default 50).
 *
 * ## Errors
 *
 * Every failure is `{"error": "<message>", "status": <n>}`; a 429 also carries
 * `retryAfter` (seconds). The rate limit is 100 requests per minute.
 */
export const API_BASE = "https://api.perspective.co";
export const API_PREFIX = "/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

export interface PerspectiveMeta {
  total?: number;
  page?: number;
  limit?: number;
  hasNext?: boolean;
}

export interface PerspectiveErrorBody {
  error?: string;
  status?: number;
  retryAfter?: number;
}

/** True when `v` has the vendor's error shape: a string `error` and a numeric `status`. */
export function isPerspectiveError(v: unknown): v is PerspectiveErrorBody {
  return typeof v === "object" && v !== null && !Array.isArray(v) &&
    typeof (v as PerspectiveErrorBody).error === "string" &&
    typeof (v as PerspectiveErrorBody).status === "number";
}

export function formatError(status: number, body: unknown): string {
  if (isPerspectiveError(body)) {
    const retry = body.retryAfter !== undefined ? ` (retry after ${body.retryAfter}s)` : "";
    return `Perspective ${body.status ?? status}: ${body.error}${retry}`;
  }
  return `Perspective returned HTTP ${status}`;
}

/** Percent-encode one path segment so a pasted `/` cannot escape it. */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id).trim());
}

export function requireString(value: unknown, label: string): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) throw new Error(`${label} is required`);
  return s;
}

/** Normalise a date-time to the ISO 8601 UTC form the metrics endpoints document. */
export function isoDate(value: unknown, label: string): string {
  const s = requireString(value, label);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`${label} is not a valid ISO 8601 date-time`);
  return d.toISOString();
}

export class PerspectiveClient {
  constructor(private readonly ctx: HookContext) {}

  /** Issue a request and return the parsed JSON body (the whole envelope). */
  async request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: opts.method ?? "GET", headers };
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = undefined;
    }
    if (!res.ok) throw new Error(formatError(res.status, parsed));
    return parsed as T;
  }

  /** Unwrap `{data}`. */
  async data<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    const body = await this.request<{ data: T }>(path, opts);
    return body?.data;
  }
}
