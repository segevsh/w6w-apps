import type { HookContext } from "@w6w/types";

/**
 * Webconnex public API v2 client (RegFox, TicketSpice, RedPodium, GivingFuel).
 *
 * Verified against https://docs.webconnex.io/api/v2/ and live probes against
 * `api.webconnex.com` on 2026-10-06. Credentials are never added here: the Auth `sign` hook
 * stamps the `apiKey` header.
 *
 * Every response is an envelope: `{responseCode, data, totalResults?, startingAfter?, hasMore?}`
 * on success and `{responseCode, error: {code, description}}` on failure. The reference page
 * documents the failure text as `error.message`; the live API sends `error.description`. Both
 * are read.
 */
export const API_BASE = "https://api.webconnex.com";
export const API_PREFIX = "/v2/public";

export type QueryValue = string | number | boolean | undefined | null;

export interface Envelope<T = unknown> {
  responseCode?: number;
  data?: T;
  totalResults?: number;
  startingAfter?: number;
  hasMore?: boolean;
  error?: { code?: number; description?: string; message?: string };
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** The vendor's own error text, whichever of the two field names it used. */
export function errorText(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const err = (body as Envelope).error;
  if (!err || typeof err !== "object") return undefined;
  const text = err.description ?? err.message;
  const code = err.code !== undefined ? `[${err.code}] ` : "";
  return typeof text === "string" ? `${code}${text}` : undefined;
}

export function buildQuery(query: Record<string, QueryValue> | undefined): string {
  if (!query) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export function encodeId(id: unknown): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Comma-separated string or array -> trimmed non-empty list. */
export function toList(v: unknown): string[] {
  if (v === undefined || v === null || v === "") return [];
  return (Array.isArray(v) ? v : String(v).split(",")).map((s) => String(s).trim()).filter(Boolean);
}

/** A JSON string or an already-parsed value; blank stays undefined. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export class RegfoxClient {
  constructor(private readonly ctx: HookContext) {}

  /**
   * Perform a call and return the parsed envelope. Throws on a non-2xx status OR on an error
   * envelope: the vendor reports a rejected key as HTTP 404 `invalid apiKey`, so the status
   * alone says nothing about what failed. A 204 (delete) yields an empty envelope.
   */
  async call<T = unknown>(path: string, opts: RequestOptions = {}): Promise<Envelope<T>> {
    const method = opts.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(
      `${API_BASE}${API_PREFIX}${path}${buildQuery(opts.query)}`,
      { method, headers, body },
    );
    const text = await res.text();
    let parsed: Envelope<T> | null = null;
    try {
      parsed = text ? JSON.parse(text) as Envelope<T> : null;
    } catch {
      parsed = null;
    }
    if (!res.ok || (parsed && parsed.error)) {
      const detail = errorText(parsed) ?? text.slice(0, 300);
      throw new Error(`RegFox ${method} ${path} failed (HTTP ${res.status}) ${detail}`.trim());
    }
    if (parsed === null) {
      if (res.status === 204 || text === "") return {};
      throw new Error(`RegFox ${method} ${path} returned a non-JSON body (HTTP ${res.status})`);
    }
    return parsed;
  }
}

/**
 * A webhook object carries `signingSecret` (the HMAC key for `X-Webconnex-Signature`) and, on
 * older webhooks, a `token`. Both are credential material a workflow log must not capture, and
 * the signature check belongs to whoever receives the webhook, so reads never return them.
 */
export function redactWebhook<T>(webhook: T): T {
  if (!webhook || typeof webhook !== "object" || Array.isArray(webhook)) return webhook;
  const copy = { ...(webhook as Record<string, unknown>) };
  delete copy.signingSecret;
  delete copy.token;
  return copy as T;
}
