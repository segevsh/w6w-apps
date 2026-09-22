import type { HookContext } from "@w6w/types";

/**
 * SEMrush Standard API v4 client.
 *
 * Everything in this module was verified on 2026-09-22 against SEMrush's own
 * v4 API reference (`developer.semrush.com/api/v4/...`) and live `curl` probes
 * against `api.semrush.com` and `www.semrush.com`. Nothing came from a
 * third-party integration directory.
 *
 * ## Two hosts, and they are not the same API
 *
 *  - **`api.semrush.com/apis/v4/<domain>/v1/<resource>`** — the current
 *    Standard API. Every Action except the balance read goes here. Calls are
 *    metered in paid *API units*.
 *  - **`www.semrush.com/users/countapiunits.html`** — a **legacy** host, still
 *    documented in September 2026, that reads the account's remaining API-unit
 *    balance and costs **zero** units. It takes the key as a `?key=` query
 *    parameter (no header form is documented) and answers a bare number as
 *    plain text, not JSON. See {@link fetchApiUnits}.
 *
 * Both hosts are in the manifest's `network.allow`, because both are genuinely
 * called. A third host — a public status page — does not exist for SEMrush, so
 * the app declares none.
 *
 * ## One envelope, success and failure
 *
 * Success: `{"meta": {...request echo, success: true, status_code, request_id},
 * "data": <object or array>}`. {@link SemrushClient.data} unwraps `data`.
 *
 * Failure: `{"meta": {"success": false, "status_code": <n>, "request_id": "..."},
 * "error": {"code": <n>, "message": "...", "retryable": <bool>, "details": {}}}`.
 * It is the same shape whether the key is missing or wrong — a live probe of
 * both produced byte-identical bodies — so nothing about credential liveness
 * can be read off a Standard-API error. {@link formatSemrushError} turns it
 * into one readable line and keeps `retryable` visible, because "retry" and
 * "fix the key" are different responses.
 *
 * ## The credential-echo trap
 *
 * The legacy balance endpoint is the one place a SEMrush **error body echoes
 * the credential**: an invalid key returns
 * `{"errors":[{"field":"key","message":"invalid api key: <the key that was sent>"}]}`.
 * Anything built on it must never surface the vendor's own error text —
 * {@link fetchApiUnits} throws a status-only message instead, and
 * `auth/api-key.ts` does the same. See the README for the full account.
 *
 * ## No rate-limit headers
 *
 * No `RateLimit-*`/`X-RateLimit-*`/`Retry-After` header was found on any probed
 * success or failure response, so the app declares no `quota` health check;
 * the only quota-shaped reading available is the balance endpoint's unit count.
 */

/** The Standard API origin. */
export const API_BASE = "https://api.semrush.com";

/** Every Standard-API path carries this prefix: `/apis/v4/<domain>/v1/<resource>`. */
export const API_PREFIX = "/apis/v4";

/** The legacy host that serves the free API-unit balance endpoint. */
export const LEGACY_BASE = "https://www.semrush.com";

/** Path of the free balance endpoint, relative to {@link LEGACY_BASE}. */
export const API_UNITS_PATH = "/users/countapiunits.html";

/** Fully-qualified balance URL. `sign` appends `?key=` to whatever is sent here. */
export const API_UNITS_URL = `${LEGACY_BASE}${API_UNITS_PATH}`;

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  query?: Record<string, QueryValue>;
}

/** The documented failure envelope, in the exact shape observed on the wire. */
export interface SemrushErrorEnvelope {
  meta: { success: false; status_code?: number; request_id?: string };
  error: { code: number; message?: string; retryable?: boolean; details?: unknown };
}

/**
 * Does this body look like the documented SEMrush error envelope?
 *
 * The predicate is deliberately structural (`meta.success === false` **and** a
 * numeric `error.code`) rather than a status-code test, because the app needs
 * the same answer for two different jobs: telling a real API error from a CDN
 * or maintenance page in {@link formatSemrushError}, and recognising the
 * schema-correct 401 that `health/service.ts` treats as proof of reachability.
 *
 * Nothing here is credential material — this endpoint's error text is the plain
 * `"Unauthorized"`, unlike the legacy balance endpoint's. See the module note.
 */
export function isSemrushErrorEnvelope(body: unknown): body is SemrushErrorEnvelope {
  if (!body || typeof body !== "object") return false;
  const meta = (body as { meta?: unknown }).meta;
  const error = (body as { error?: unknown }).error;
  if (!meta || typeof meta !== "object" || (meta as { success?: unknown }).success !== false) {
    return false;
  }
  if (!error || typeof error !== "object") return false;
  return typeof (error as { code?: unknown }).code === "number";
}

/** Parse a raw body into the error envelope, or `undefined` if it is not one. */
export function parseSemrushError(raw: string): SemrushErrorEnvelope | undefined {
  if (!raw) return undefined;
  try {
    const body = JSON.parse(raw) as unknown;
    return isSemrushErrorEnvelope(body) ? body : undefined;
  } catch {
    return undefined;
  }
}

/** Keep an error message readable — a page of HTML from a CDN is not. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * One readable line for a failed Standard-API call.
 *
 * A documented envelope contributes its own `code` and `message`; `retryable`
 * is called out because it is the difference between "back off and try again"
 * and "this will fail the same way forever". Anything that is *not* the
 * documented envelope (a maintenance page, a gateway error) keeps the status
 * and a bounded excerpt so the shape of the failure survives without flooding
 * the log.
 */
export function formatSemrushError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  const envelope = parseSemrushError(raw);
  if (!envelope) {
    const detail = raw.trim();
    return truncate(
      `SEMrush returned HTTP ${status} for ${method} ${path}${detail ? `: ${detail}` : ""}`,
      1000,
    );
  }
  const parts = [
    `SEMrush ${status} ${envelope.error.code} for ${method} ${path}`,
    envelope.error.message,
    envelope.error.retryable === true
      ? "SEMrush marks this retryable — back off and retry; a call that reached the API may " +
        "already have spent API units"
      : undefined,
  ].filter((part): part is string => Boolean(part));
  return truncate(parts.join(": "), 1000);
}

/**
 * Read the free API-unit balance.
 *
 * The request carries no query string: `sign` is what appends `?key=`, because
 * a credential never appears in an Action. On failure nothing from the vendor's
 * body is surfaced — this endpoint echoes the submitted key back inside its
 * error text, so only the HTTP status crosses the boundary.
 */
export async function fetchApiUnits(ctx: HookContext): Promise<number> {
  let res: Response;
  try {
    res = await ctx.fetch(API_UNITS_URL, { headers: { accept: "*/*" } });
  } catch {
    // The transport error's own message can quote the request URL, which now
    // carries the key; it is replaced rather than passed through.
    throw new Error("SEMrush's API-units endpoint could not be reached");
  }
  // The body is read only on success. On failure it is deliberately left
  // unread: it may contain the submitted key verbatim.
  if (!res.ok) {
    throw new Error(`SEMrush returned HTTP ${res.status} for the API-units endpoint`);
  }
  const balance = parseApiUnits(await res.text().catch(() => ""));
  if (balance === undefined) {
    throw new Error(
      `SEMrush returned HTTP ${res.status} for the API-units endpoint but the body was not a ` +
        "unit count",
    );
  }
  return balance;
}

/**
 * Parse the balance endpoint's plain-text body.
 *
 * The vendor documents the example `1,000`, so thousands separators are
 * stripped before the digits are read. A body that is not a plain integer —
 * empty, HTML, JSON — is `undefined` rather than `NaN`, so a caller can tell
 * "not a balance" from "a balance of zero". Zero is accepted: a live key whose
 * units are spent still proves the connection.
 */
export function parseApiUnits(text: string): number | undefined {
  const digits = text.replace(/,/g, "").trim();
  if (!/^\d+$/.test(digits)) return undefined;
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : undefined;
}

export class SemrushClient {
  constructor(private ctx: HookContext) {}

  /** `{"meta": …, "data": …}` in, `data` out. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    const body = JSON.parse(text) as { data?: T };
    return (body && typeof body === "object" && "data" in body ? body.data : body) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [name, value] of Object.entries(options.query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      // Every multi-valued SEMrush query parameter (`fields`, `urls`) is
      // documented as ONE comma-separated value, not as a repeated key.
      url.searchParams.set(name, Array.isArray(value) ? value.join(",") : String(value));
    }

    const res = await this.ctx.fetch(url.toString(), {
      method: "GET",
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatSemrushError(res.status, "GET", url.pathname, detail));
    }
    return res;
  }
}
