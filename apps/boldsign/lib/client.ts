/**
 * BoldSign REST API (`https://api.boldsign.com/v1`, or a regional sibling).
 *
 * Every path, parameter and response field used by this app was read off
 * BoldSign's own machine-readable contract —
 * `https://api.boldsign.com/swagger/v1/swagger.json` (OpenAPI 3.0, "BoldSign
 * API" v1, fetched 2026-09-15) — and cross-checked live against
 * `api.boldsign.com` on the same date. Nothing here is inferred from a naming
 * pattern.
 *
 * ## Four regions, not one host
 *
 * BoldSign's docs (`api-overview/versioning`) name four independent API
 * hosts, one per region an account can be provisioned in:
 *
 *   - `api.boldsign.com`     (US, default)
 *   - `api-eu.boldsign.com`  (Europe)
 *   - `api-ca.boldsign.com`  (Canada)
 *   - `api-au.boldsign.com`  (Australia)
 *
 * An account (and the API keys it issues) lives on exactly one of these —
 * this app makes `apiHost` a connect-time field rather than hardcoding the US
 * host, the same shape `signnow`'s sandbox/production split uses.
 *
 * ## Auth
 *
 * `X-API-KEY: <key>` — a plain header, no prefix (verified against
 * `authentication/api-key`'s own cURL example and live against
 * `api.boldsign.com`). OAuth2 (authorization-code + PKCE, against
 * `account.boldsign.com/connect/authorize`) is also documented and
 * deliberately not implemented here — API Key is the simpler, fully
 * server-to-server credential and is what every action in this app needs.
 *
 * ## Errors — and a live 401 carries NO body at all
 *
 * BoldSign's OpenAPI contract documents a JSON `ErrorResult` (`{"error":
 * string}`) or `ErrorResponse` (`{"errorType", "error"}`) body on every
 * non-2xx response. Verified live 2026-09-15, that is true for a **routed**
 * request BoldSign can act on:
 *
 * ```
 * GET /v1/does-not-exist                 (bad route, bad key)
 *   -> 404 {"error":{"message":"Unrecognized request URL …","type":"invalid_request_error"}}
 * ```
 *
 * But a request rejected for **authentication** — a missing or invalid
 * `X-API-KEY`, on an otherwise-real route — comes back **401 with
 * `content-length: 0`**: no body, not even an empty JSON object. This app's
 * error classifier therefore never assumes a body exists; it reads one when
 * present and falls back to the HTTP status when it is not, and the
 * `api-key` Auth's `test` hook (see `auth/api-key.ts`) does the same rather
 * than parsing a response it might not get.
 *
 * ## Rate-limit headers exist, but only sometimes
 *
 * `api-overview/rate-limit` documents 2000 req/hour (live) or 50 req/hour
 * (sandbox key) per account, "tracked in the API response headers" with no
 * header names given. Live 2026-09-15: `x-rate-limit-limit` (a duration
 * label, e.g. `"1h"`, not a number), `x-rate-limit-remaining` and
 * `x-rate-limit-reset` (ISO 8601) are present on a 404 to a real host, but
 * ABSENT on a 401 for a bad/missing key on a real route — the rate limiter
 * appears to run after auth in BoldSign's pipeline, so a failed-auth response
 * carries no quota signal. This app reads them opportunistically off
 * whatever signed response it gets (see `health/quota.ts`); it never treats
 * their absence as an error.
 *
 * ## No auth header here
 *
 * The runtime routes every `ctx.fetch` through the auth `sign` hook, which is
 * the only code handed the credential. This client never sets one.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

/** The four hosts BoldSign issues accounts (and API keys) against. */
export const API_HOSTS = {
  us: "api.boldsign.com",
  eu: "api-eu.boldsign.com",
  ca: "api-ca.boldsign.com",
  au: "api-au.boldsign.com",
} as const;

export type ApiHost = typeof API_HOSTS[keyof typeof API_HOSTS];

/** Read the `apiHost` `afterConnect`/`fields` recorded. Never the raw credential. */
export function apiHostFrom(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { apiHost?: string };
  return display.apiHost || API_HOSTS.us;
}

/** BoldSign's documented error envelope shapes — read defensively, never assumed present. */
export interface BoldSignError {
  error?: string | { message?: string; type?: string };
  errorType?: string;
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue | QueryValue[]>;
  /** JSON request body. Omitted keys are never sent. */
  body?: unknown;
  /** Return the raw `Response` instead of a parsed JSON body (e.g. a file download). */
  raw?: boolean;
  headers?: Record<string, string>;
}

/** Drop `undefined` / `null` / `""` so an unset optional param is never sent. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** Message text out of whichever error shape BoldSign actually sent, if any. */
export function messageFrom(body: BoldSignError | undefined): string | undefined {
  if (!body) return undefined;
  if (typeof body.error === "string") return body.error;
  if (body.error && typeof body.error === "object") {
    return [body.error.type, body.error.message].filter(Boolean).join(": ") || undefined;
  }
  return body.errorType;
}

/**
 * Thin wrapper over `ctx.fetch`, composing `https://{apiHost}/v1` from the
 * Connection. Never sets an auth header — `sign` does that.
 */
export class BoldSignClient {
  private readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = `https://${apiHostFrom(ctx.connection)}/v1`;
  }

  /** Exposed for tests and log messages. */
  get apiBase(): string {
    return this.base;
  }

  /** Issue a request and return the parsed JSON body (or the raw `Response`). */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item === undefined || item === null || item === "") continue;
          url.searchParams.append(k, String(item));
        }
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);

    if (!res.ok) {
      // A failed-auth response may carry no body at all (see module doc) —
      // read one only if present, and never let a parse attempt on an empty
      // body mask the real HTTP status.
      const text = await res.text().catch(() => "");
      let parsed: BoldSignError | undefined;
      if (text) {
        try {
          parsed = JSON.parse(text) as BoldSignError;
        } catch {
          // Non-JSON error body — fall back to the raw text.
        }
      }
      const label = messageFrom(parsed) || (text ? text.slice(0, 200) : res.statusText);
      throw new Error(`BoldSign ${res.status} for ${method} ${url.pathname}: ${label}`);
    }

    if (options.raw) return res as unknown as T;

    if (res.status === 204) {
      await res.body?.cancel();
      return undefined as T;
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
