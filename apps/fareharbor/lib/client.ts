import type { HookContext } from "@w6w/types";

/**
 * FareHarbor External API client.
 *
 * Everything here comes from FareHarbor's own OpenAPI 3.1 document
 * (`https://fareharbor.com/api/external/v1/FareHarbor-External-API.yaml/home`, 771,984 bytes,
 * the file the Redoc page at developer.fareharbor.com loads, fetched 2026-10-06) plus live
 * unauthenticated probes against `fareharbor.com` and `status.fareharbor.com` on the same day.
 *
 * ## One production host, one prefix
 *
 * The document declares two servers: production `https://fareharbor.com/api/external/v1` and
 * a `demo.fareharbor.com` sandbox. This app is production-only — the manifest allows one
 * API host — so sandbox keys (issued separately, before certification) will not work here.
 * Every path keeps its trailing slash exactly as documented.
 *
 * ## Errors are `{"error", "status", "code"}`
 *
 * Measured 2026-10-06 (`content-type: application/json`):
 *
 * ```
 * no keys           -> 400 {"error":"X-FareHarbor-API-App header or api-app parameter is
 *                           required","status":400,"code":"key-missing"}
 * bad app key       -> 403 {"error":"API app key is invalid","status":403,"code":"app-key-invalid"}
 * ```
 *
 * The `code` is the stable part (the spec's error table lists them); {@link errorCode} and
 * {@link errorText} read it so callers branch on the code, not the status.
 *
 * ## Rate limits
 *
 * 30 requests/second and 3,000 per 5 minutes, both per IP rather than per key; over either
 * answers 429 **or 403** (spec, "Rate Limits") — so a 403 is not always a bad key. Requests
 * time out at 60 seconds with a 504 (availability ranges: shorten the range).
 */

export const API_HOST = "fareharbor.com";
export const API_BASE = `https://${API_HOST}`;
export const API_PREFIX = "/api/external/v1";
export const API_ROOT = `${API_BASE}${API_PREFIX}`;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Drop unset values; `false` and `0` are meaningful and kept. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Build `?a=yes&b=no`. FareHarbor's flag parameters (`detailed`, `bookable_only`,
 * `require_future_availabilities`, `with_payments`, …) are documented as `yes`/`no`
 * strings, so booleans are written that way.
 */
export function queryString(query: Record<string, QueryValue> = {}): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(compact(query))) {
    sp.append(k, typeof v === "boolean" ? (v ? "yes" : "no") : String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** The vendor's error `code` (e.g. `app-key-invalid`), when the body is its error envelope. */
export function errorCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const c = (body as Record<string, unknown>).code;
  return typeof c === "string" && c ? c : undefined;
}

/** The vendor's own sentence from an error body. */
export function errorText(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const e = (body as Record<string, unknown>).error;
  return typeof e === "string" && e ? e : undefined;
}

/** Thin client over `ctx.fetch`. It never sets the key headers — `sign` does. */
export class FareHarborClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    const url = `${API_ROOT}${path}${queryString(opts.query)}`;
    const headers: Record<string, string> = { accept: "application/json" };
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(url, { method: opts.method ?? "GET", headers, body });
    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        if (res.ok) throw new Error(`FareHarbor ${res.status}: response was not JSON`);
      }
    }
    if (!res.ok) {
      const code = errorCode(parsed);
      const msg = errorText(parsed) ?? (text ? text.slice(0, 300) : res.statusText);
      throw new Error(`FareHarbor ${res.status}${code ? ` ${code}` : ""}${msg ? `: ${msg}` : ""}`);
    }
    return parsed as T;
  }

  get<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>(path, { query });
  }
}
