import type { HookContext } from "@w6w/types";

/**
 * Supadata REST API — verified 2026-10-06 against the vendor's published OpenAPI document
 * (`docs.supadata.ai/api-reference/v1-openapi.json`, linked from its `llms.txt`), the per-endpoint
 * pages, and live probes of `api.supadata.ai`.
 *
 * - Base `https://api.supadata.ai/v1`; the key travels in the `x-api-key` header, added by the
 *   Auth `sign` hook, never here.
 * - One error envelope for every failure: `{ error, message, details, documentationUrl }` where
 *   `error` is one of `invalid-request`, `internal-error`, `forbidden`, `unauthorized`,
 *   `upgrade-required`, `transcript-unavailable`, `not-found`, `limit-exceeded`.
 * - **`GET /transcript` can answer HTTP 206 with that error envelope** for
 *   `transcript-unavailable`. 206 is `res.ok`, so a status check alone would hand the error back as
 *   a result; `json()` throws on an envelope whatever the status.
 */
export const API_HOST = "api.supadata.ai";
export const API_BASE = `https://${API_HOST}/v1`;

type Scalar = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, Scalar | Scalar[]>;
  /** JSON body. */
  body?: unknown;
}

export interface SupadataError {
  error?: string;
  message?: string;
  details?: string;
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} chars truncated)`;
}

/** Drop `undefined`/`null`/empty-string members so the wire carries only what was set. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Accepts an array or a comma/newline-separated string; returns trimmed non-empty items. */
export function toList(v: string[] | string | undefined): string[] {
  const items = Array.isArray(v) ? v : String(v ?? "").split(/[\n,]/);
  return items.map((s) => String(s).trim()).filter(Boolean);
}

export function requireText(value: unknown, label: string): string {
  const s = String(value ?? "").trim();
  if (!s) throw new Error(`${label} is required`);
  return s;
}

/** True when `body` is the vendor's error envelope. */
export function isErrorEnvelope(body: unknown): body is SupadataError {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return typeof b.error === "string" && typeof b.message === "string";
}

export function errorText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed) as SupadataError;
    if (isErrorEnvelope(parsed)) {
      return `${parsed.error}: ${parsed.details || parsed.message}`;
    }
  } catch { /* not JSON */ }
  if (/^\s*<(!doctype|html)/i.test(trimmed)) {
    return /<title>([^<]*)<\/title>/i.exec(trimmed)?.[1] ?? "HTML error page";
  }
  return trimmed;
}

export function formatError(status: number, method: string, path: string, raw: string): string {
  const hint = status === 401
    ? " — the API key was rejected or never reached the request; reconnect this connection"
    : status === 402
    ? " — this feature is not on the current plan"
    : status === 429
    ? " — the rate limit or the monthly credits are used up; retry later or upgrade"
    : "";
  return truncate(`Supadata ${status} for ${method} ${path}: ${errorText(raw)}${hint}`, 1000);
}

export class SupadataClient {
  constructor(private ctx: HookContext) {}

  async json<T = Record<string, unknown>>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      for (const item of Array.isArray(v) ? v : [v]) {
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
    // No key here: the Auth `sign` hook adds `x-api-key` to every request.
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) throw new Error(formatError(res.status, method, path, text));
    if (!text) return {} as T;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(
        `Supadata ${res.status} for ${path}: expected JSON, got ${truncate(text, 200)}`,
      );
    }
    if (isErrorEnvelope(parsed)) throw new Error(formatError(res.status, method, path, text));
    return parsed as T;
  }
}
